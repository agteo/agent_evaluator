from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.dataset import (
    DatasetCreate,
    DatasetUpdate,
    DatasetOut,
    DatasetAddTraces,
    DatasetRemoveTraces,
)
from app.services import dataset_service

router = APIRouter(prefix="/api/datasets", tags=["datasets"])


@router.post("", response_model=DatasetOut, status_code=201)
async def create_dataset(
    data: DatasetCreate,
    db: AsyncSession = Depends(get_db),
):
    dataset = await dataset_service.create_dataset(db, data)
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        version=dataset.version,
        trace_count=0,
        created_at=dataset.created_at,
        updated_at=dataset.updated_at,
    )


@router.get("", response_model=dict)
async def list_datasets(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    items, total = await dataset_service.list_datasets(db, offset=offset, limit=limit)
    return {
        "items": [DatasetOut(**item) for item in items],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{dataset_id}", response_model=DatasetOut)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    dataset = await dataset_service.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(404, f"Dataset {dataset_id} not found")
    trace_count = await dataset_service.get_dataset_trace_count(db, dataset_id)
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        version=dataset.version,
        trace_count=trace_count,
        created_at=dataset.created_at,
        updated_at=dataset.updated_at,
    )


@router.put("/{dataset_id}", response_model=DatasetOut)
async def update_dataset(
    dataset_id: int,
    data: DatasetUpdate,
    db: AsyncSession = Depends(get_db),
):
    dataset = await dataset_service.update_dataset(db, dataset_id, data)
    if not dataset:
        raise HTTPException(404, f"Dataset {dataset_id} not found")
    trace_count = await dataset_service.get_dataset_trace_count(db, dataset_id)
    return DatasetOut(
        id=dataset.id,
        name=dataset.name,
        description=dataset.description,
        version=dataset.version,
        trace_count=trace_count,
        created_at=dataset.created_at,
        updated_at=dataset.updated_at,
    )


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await dataset_service.delete_dataset(db, dataset_id)
    if not deleted:
        raise HTTPException(404, f"Dataset {dataset_id} not found")
    return {"deleted": True}


@router.get("/{dataset_id}/traces")
async def get_dataset_traces(dataset_id: int, db: AsyncSession = Depends(get_db)):
    dataset = await dataset_service.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(404, f"Dataset {dataset_id} not found")
    trace_ids = await dataset_service.get_dataset_trace_ids(db, dataset_id)
    return {"trace_ids": trace_ids}


@router.post("/{dataset_id}/add-traces")
async def add_traces(
    dataset_id: int,
    data: DatasetAddTraces,
    db: AsyncSession = Depends(get_db),
):
    dataset = await dataset_service.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(404, f"Dataset {dataset_id} not found")
    result = await dataset_service.add_traces(db, dataset_id, data.trace_ids)
    return result


@router.post("/{dataset_id}/remove-traces")
async def remove_traces(
    dataset_id: int,
    data: DatasetRemoveTraces,
    db: AsyncSession = Depends(get_db),
):
    dataset = await dataset_service.get_dataset(db, dataset_id)
    if not dataset:
        raise HTTPException(404, f"Dataset {dataset_id} not found")
    result = await dataset_service.remove_traces(db, dataset_id, data.trace_ids)
    return result
