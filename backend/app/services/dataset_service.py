from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dataset import Dataset, DatasetTrace
from app.models.trace import Trace
from app.schemas.dataset import DatasetCreate, DatasetUpdate


async def create_dataset(db: AsyncSession, data: DatasetCreate) -> Dataset:
    dataset = Dataset(name=data.name, description=data.description)
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset


async def list_datasets(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[dict], int]:
    query = select(Dataset).order_by(Dataset.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    datasets = list(result.scalars().all())

    count_result = await db.execute(select(func.count(Dataset.id)))
    total = count_result.scalar() or 0

    items = []
    for d in datasets:
        tc = await get_dataset_trace_count(db, d.id)
        items.append({
            "id": d.id,
            "name": d.name,
            "description": d.description,
            "version": d.version,
            "trace_count": tc,
            "created_at": d.created_at,
            "updated_at": d.updated_at,
        })

    return items, total


async def get_dataset(db: AsyncSession, dataset_id: int) -> Dataset | None:
    return await db.get(Dataset, dataset_id)


async def get_dataset_trace_count(db: AsyncSession, dataset_id: int) -> int:
    result = await db.execute(
        select(func.count(DatasetTrace.id)).where(DatasetTrace.dataset_id == dataset_id)
    )
    return result.scalar() or 0


async def get_dataset_trace_ids(db: AsyncSession, dataset_id: int) -> list[str]:
    result = await db.execute(
        select(DatasetTrace.trace_id).where(DatasetTrace.dataset_id == dataset_id)
    )
    return list(result.scalars().all())


async def get_dataset_traces(db: AsyncSession, dataset_id: int) -> list[Trace]:
    result = await db.execute(
        select(Trace)
        .join(DatasetTrace, DatasetTrace.trace_id == Trace.id)
        .where(DatasetTrace.dataset_id == dataset_id)
        .order_by(DatasetTrace.added_at.desc())
    )
    return list(result.scalars().all())


async def update_dataset(
    db: AsyncSession, dataset_id: int, data: DatasetUpdate
) -> Dataset | None:
    dataset = await db.get(Dataset, dataset_id)
    if not dataset:
        return None

    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(dataset, key, value)

    dataset.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(dataset)
    return dataset


async def delete_dataset(db: AsyncSession, dataset_id: int) -> bool:
    dataset = await db.get(Dataset, dataset_id)
    if not dataset:
        return False
    await db.delete(dataset)
    await db.commit()
    return True


async def add_traces(
    db: AsyncSession, dataset_id: int, trace_ids: list[str]
) -> dict:
    existing = await db.execute(
        select(DatasetTrace.trace_id).where(
            and_(
                DatasetTrace.dataset_id == dataset_id,
                DatasetTrace.trace_id.in_(trace_ids),
            )
        )
    )
    existing_ids = set(existing.scalars().all())

    added = 0
    skipped = 0
    for tid in trace_ids:
        if tid in existing_ids:
            skipped += 1
            continue
        db.add(DatasetTrace(dataset_id=dataset_id, trace_id=tid))
        added += 1

    if added > 0:
        dataset = await db.get(Dataset, dataset_id)
        if dataset:
            dataset.version += 1
            dataset.updated_at = datetime.utcnow()
        await db.commit()

    return {"added": added, "skipped": skipped}


async def remove_traces(
    db: AsyncSession, dataset_id: int, trace_ids: list[str]
) -> dict:
    result = await db.execute(
        select(DatasetTrace).where(
            and_(
                DatasetTrace.dataset_id == dataset_id,
                DatasetTrace.trace_id.in_(trace_ids),
            )
        )
    )
    rows = list(result.scalars().all())

    for row in rows:
        await db.delete(row)

    if rows:
        dataset = await db.get(Dataset, dataset_id)
        if dataset:
            dataset.version += 1
            dataset.updated_at = datetime.utcnow()
        await db.commit()

    return {"removed": len(rows)}
