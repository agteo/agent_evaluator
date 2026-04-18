from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(get_settings().database_url, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def _sqlite_table_columns(conn, table_name: str) -> set[str]:
    result = await conn.execute(text(f"PRAGMA table_info({table_name})"))
    return {row[1] for row in result.fetchall()}


async def _ensure_eval_run_columns(conn) -> None:
    existing = await _sqlite_table_columns(conn, "eval_runs")
    column_defs = {
        "name": "ALTER TABLE eval_runs ADD COLUMN name VARCHAR(256)",
        "description": "ALTER TABLE eval_runs ADD COLUMN description TEXT",
        "owner": "ALTER TABLE eval_runs ADD COLUMN owner VARCHAR(128)",
        "tags": "ALTER TABLE eval_runs ADD COLUMN tags JSON",
        "source_label": "ALTER TABLE eval_runs ADD COLUMN source_label VARCHAR(128)",
        "prompt_version": "ALTER TABLE eval_runs ADD COLUMN prompt_version VARCHAR(128)",
        "commit_sha": "ALTER TABLE eval_runs ADD COLUMN commit_sha VARCHAR(128)",
        "baseline_run_id": "ALTER TABLE eval_runs ADD COLUMN baseline_run_id INTEGER",
    }
    for column, ddl in column_defs.items():
        if column not in existing:
            await conn.execute(text(ddl))


async def _ensure_trace_columns(conn) -> None:
    existing = await _sqlite_table_columns(conn, "traces")
    column_defs = {
        "source_type": "ALTER TABLE traces ADD COLUMN source_type VARCHAR(64)",
        "source_connection_id": "ALTER TABLE traces ADD COLUMN source_connection_id INTEGER",
        "external_id": "ALTER TABLE traces ADD COLUMN external_id VARCHAR(128)",
    }
    for column, ddl in column_defs.items():
        if column not in existing:
            await conn.execute(text(ddl))


async def init_db() -> None:
    # Import model modules before metadata.create_all so all tables are registered,
    # even when init_db is called from a narrow code path.
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_eval_run_columns(conn)
        await _ensure_trace_columns(conn)
        # WAL mode allows one writer and concurrent readers, reducing "database is locked".
        await conn.execute(text("PRAGMA journal_mode=WAL"))


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session
