from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.connectors.langfuse import LangfuseConnector
from app.models.connection import Connection
from app.models.connection_sync_run import ConnectionSyncRun
from app.schemas.connection import ConnectionCreate, ConnectionUpdate
from app.services.ingestion_service import import_langfuse_traces


def _serialize_connection_config(provider: str, config: dict[str, Any]) -> dict[str, Any]:
    if provider == "langfuse_api":
        return {
            "base_url": config["base_url"].rstrip("/"),
            "public_key": config["public_key"],
            "secret_key": config["secret_key"],
            "batch_size": config.get("batch_size", 50),
        }
    raise ValueError(f"Unsupported provider: {provider}")


def _sanitize_connection(connection: Connection) -> dict[str, Any]:
    config = dict(connection.config or {})
    if connection.provider == "langfuse_api":
        config = {
            "base_url": config.get("base_url", ""),
            "public_key": config.get("public_key", ""),
            "has_secret_key": bool(config.get("secret_key")),
            "batch_size": config.get("batch_size", 50),
        }

    return {
        "id": connection.id,
        "name": connection.name,
        "provider": connection.provider,
        "status": connection.status,
        "config": config,
        "schedule_enabled": connection.schedule_enabled,
        "sync_interval_minutes": connection.sync_interval_minutes,
        "last_sync_at": connection.last_sync_at,
        "last_cursor": connection.last_cursor,
        "last_error": connection.last_error,
        "created_at": connection.created_at,
        "updated_at": connection.updated_at,
    }


async def list_connections(db: AsyncSession) -> list[dict[str, Any]]:
    result = await db.execute(select(Connection).order_by(Connection.created_at.desc()))
    return [_sanitize_connection(connection) for connection in result.scalars().all()]


async def get_connection(db: AsyncSession, connection_id: int) -> Connection | None:
    return await db.get(Connection, connection_id)


async def get_connection_payload(db: AsyncSession, connection_id: int) -> dict[str, Any] | None:
    connection = await get_connection(db, connection_id)
    if connection is None:
        return None
    return _sanitize_connection(connection)


async def create_connection(db: AsyncSession, data: ConnectionCreate) -> dict[str, Any]:
    config_payload = data.config.model_dump()
    config_payload["secret_key"] = data.config.secret_key.get_secret_value()

    connection = Connection(
        name=data.name,
        provider=data.provider,
        config=_serialize_connection_config(data.provider, config_payload),
        schedule_enabled=data.schedule_enabled,
        sync_interval_minutes=data.sync_interval_minutes if data.schedule_enabled else None,
        status="active",
    )
    db.add(connection)
    await db.commit()
    await db.refresh(connection)
    return _sanitize_connection(connection)


async def update_connection(
    db: AsyncSession,
    connection: Connection,
    data: ConnectionUpdate,
) -> dict[str, Any]:
    if data.name is not None:
        connection.name = data.name
    if data.status is not None:
        connection.status = data.status
    if data.schedule_enabled is not None:
        connection.schedule_enabled = data.schedule_enabled
        if not data.schedule_enabled:
            connection.sync_interval_minutes = None
    if data.sync_interval_minutes is not None:
        connection.sync_interval_minutes = data.sync_interval_minutes
    if data.config is not None:
        config_payload = data.config.model_dump()
        config_payload["secret_key"] = data.config.secret_key.get_secret_value()
        connection.config = _serialize_connection_config(connection.provider, config_payload)

    await db.commit()
    await db.refresh(connection)
    return _sanitize_connection(connection)


async def delete_connection(db: AsyncSession, connection: Connection) -> None:
    await db.execute(
        delete(ConnectionSyncRun).where(ConnectionSyncRun.connection_id == connection.id)
    )
    await db.delete(connection)
    await db.commit()


async def test_connection(connection: Connection) -> dict[str, Any]:
    connector = _build_connector(connection)
    details = await connector.test_connection()
    return {"ok": True, "provider": connection.provider, "details": details}


async def sync_connection(db: AsyncSession, connection: Connection) -> ConnectionSyncRun:
    return await run_connection_sync(db, connection, trigger_mode="manual")


async def run_connection_sync(
    db: AsyncSession,
    connection: Connection,
    *,
    trigger_mode: str,
) -> ConnectionSyncRun:
    sync_run = ConnectionSyncRun(
        connection_id=connection.id,
        trigger_mode=trigger_mode,
        status="running",
        started_at=datetime.utcnow(),
    )
    db.add(sync_run)
    await db.commit()
    await db.refresh(sync_run)

    try:
        connector = _build_connector(connection)
        traces, next_cursor = await connector.fetch_traces(connection.last_cursor)
        result = await import_langfuse_traces(
            db,
            traces,
            source_type=connection.provider,
            source_connection_id=connection.id,
        )

        sync_run.status = "completed"
        sync_run.imported = result["imported"]
        sync_run.updated = result["updated"]
        sync_run.skipped = result["skipped"]
        sync_run.error_count = len(result["errors"])
        sync_run.errors = result["errors"] or None
        sync_run.details = {
            "fetched": len(traces),
            "next_cursor": next_cursor,
        }
        sync_run.finished_at = datetime.utcnow()

        connection.last_sync_at = sync_run.finished_at
        connection.last_cursor = next_cursor
        connection.last_error = None
        connection.status = "active"
    except Exception as exc:
        sync_run.status = "failed"
        sync_run.error_message = str(exc)
        sync_run.finished_at = datetime.utcnow()
        connection.last_error = str(exc)
        connection.status = "error"

    await db.commit()
    await db.refresh(sync_run)
    return sync_run


async def list_sync_runs(db: AsyncSession, connection_id: int) -> list[ConnectionSyncRun]:
    result = await db.execute(
        select(ConnectionSyncRun)
        .where(ConnectionSyncRun.connection_id == connection_id)
        .order_by(ConnectionSyncRun.started_at.desc())
    )
    return list(result.scalars().all())


async def list_due_connections(db: AsyncSession, now: datetime | None = None) -> list[Connection]:
    now = now or datetime.utcnow()
    result = await db.execute(
        select(Connection)
        .where(Connection.schedule_enabled.is_(True))
        .where(Connection.sync_interval_minutes.is_not(None))
        .where(Connection.status != "deleted")
        .order_by(Connection.last_sync_at.asc().nullsfirst(), Connection.created_at.asc())
    )
    due: list[Connection] = []
    for connection in result.scalars().all():
        if _is_connection_due(connection, now):
            due.append(connection)
    return due


def _is_connection_due(connection: Connection, now: datetime) -> bool:
    interval_minutes = connection.sync_interval_minutes
    if not connection.schedule_enabled or interval_minutes is None:
        return False

    anchor = connection.last_sync_at or connection.created_at
    return anchor + timedelta(minutes=interval_minutes) <= now


def _build_connector(connection: Connection) -> LangfuseConnector:
    if connection.provider != "langfuse_api":
        raise ValueError(f"Unsupported provider: {connection.provider}")

    config = connection.config or {}
    return LangfuseConnector(
        base_url=config["base_url"],
        public_key=config["public_key"],
        secret_key=config["secret_key"],
        batch_size=int(config.get("batch_size", 50)),
    )
