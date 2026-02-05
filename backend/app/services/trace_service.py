from __future__ import annotations

from typing import Any

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trace import Trace
from app.utils.langfuse_parser import parse_langfuse_export


async def import_traces(db: AsyncSession, raw_data: str | bytes) -> dict[str, Any]:
    """Import traces from a Langfuse JSON export."""
    parsed = parse_langfuse_export(raw_data)

    imported = 0
    skipped = 0
    errors: list[str] = []

    for trace_data in parsed:
        trace_id = trace_data["id"]
        existing = await db.get(Trace, trace_id)
        if existing:
            skipped += 1
            continue

        try:
            trace = Trace(**trace_data)
            db.add(trace)
            imported += 1
        except Exception as e:
            errors.append(f"Trace {trace_id}: {str(e)}")

    if imported > 0:
        await db.commit()

    return {"imported": imported, "skipped": skipped, "errors": errors}


async def list_traces(
    db: AsyncSession,
    *,
    search: str | None = None,
    tag: str | None = None,
    sort_by: str = "imported_at",
    sort_dir: str = "desc",
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[Trace], int]:
    """List traces with filtering, sorting, and pagination."""
    query = select(Trace)
    count_query = select(func.count(Trace.id))

    if search:
        pattern = f"%{search}%"
        filter_clause = or_(
            Trace.name.ilike(pattern),
            Trace.id.ilike(pattern),
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    if tag:
        query = query.where(Trace.tags.contains(tag))
        count_query = count_query.where(Trace.tags.contains(tag))

    # Sorting
    sort_col = getattr(Trace, sort_by, Trace.imported_at)
    if sort_dir == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    traces = list(result.scalars().all())

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    return traces, total


async def get_trace(db: AsyncSession, trace_id: str) -> Trace | None:
    return await db.get(Trace, trace_id)


async def delete_trace(db: AsyncSession, trace_id: str) -> bool:
    trace = await db.get(Trace, trace_id)
    if not trace:
        return False
    await db.delete(trace)
    await db.commit()
    return True


async def get_trace_count(db: AsyncSession) -> int:
    result = await db.execute(select(func.count(Trace.id)))
    return result.scalar() or 0
