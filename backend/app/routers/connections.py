from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.connection import (
    ConnectionCreate,
    ConnectionDeleteResult,
    ConnectionOut,
    ConnectionSyncRunOut,
    ConnectionTestResult,
    ConnectionUpdate,
)
from app.services import connection_service

router = APIRouter(prefix="/api/connections", tags=["connections"])


@router.get("", response_model=list[ConnectionOut])
async def list_connections(db: AsyncSession = Depends(get_db)):
    items = await connection_service.list_connections(db)
    return [ConnectionOut.model_validate(item) for item in items]


@router.post("", response_model=ConnectionOut)
async def create_connection(
    data: ConnectionCreate,
    db: AsyncSession = Depends(get_db),
):
    connection = await connection_service.create_connection(db, data)
    return ConnectionOut.model_validate(connection)


@router.get("/{connection_id}", response_model=ConnectionOut)
async def get_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    connection = await connection_service.get_connection_payload(db, connection_id)
    if connection is None:
        raise HTTPException(404, f"Connection {connection_id} not found")
    return ConnectionOut.model_validate(connection)


@router.patch("/{connection_id}", response_model=ConnectionOut)
async def update_connection(
    connection_id: int,
    data: ConnectionUpdate,
    db: AsyncSession = Depends(get_db),
):
    connection = await connection_service.get_connection(db, connection_id)
    if connection is None:
        raise HTTPException(404, f"Connection {connection_id} not found")
    updated = await connection_service.update_connection(db, connection, data)
    return ConnectionOut.model_validate(updated)


@router.delete("/{connection_id}", response_model=ConnectionDeleteResult)
async def delete_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    connection = await connection_service.get_connection(db, connection_id)
    if connection is None:
        raise HTTPException(404, f"Connection {connection_id} not found")
    await connection_service.delete_connection(db, connection)
    return ConnectionDeleteResult(deleted=True)


@router.post("/{connection_id}/test", response_model=ConnectionTestResult)
async def test_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    connection = await connection_service.get_connection(db, connection_id)
    if connection is None:
        raise HTTPException(404, f"Connection {connection_id} not found")

    try:
        result = await connection_service.test_connection(connection)
    except Exception as exc:
        raise HTTPException(400, str(exc))

    return ConnectionTestResult.model_validate(result)


@router.post("/{connection_id}/sync", response_model=ConnectionSyncRunOut)
async def sync_connection(connection_id: int, db: AsyncSession = Depends(get_db)):
    connection = await connection_service.get_connection(db, connection_id)
    if connection is None:
        raise HTTPException(404, f"Connection {connection_id} not found")

    sync_run = await connection_service.sync_connection(db, connection)
    return ConnectionSyncRunOut.model_validate(sync_run)


@router.get("/{connection_id}/sync-runs", response_model=list[ConnectionSyncRunOut])
async def list_sync_runs(connection_id: int, db: AsyncSession = Depends(get_db)):
    connection = await connection_service.get_connection(db, connection_id)
    if connection is None:
        raise HTTPException(404, f"Connection {connection_id} not found")

    runs = await connection_service.list_sync_runs(db, connection_id)
    return [ConnectionSyncRunOut.model_validate(run) for run in runs]
