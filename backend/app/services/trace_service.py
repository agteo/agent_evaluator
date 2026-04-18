from __future__ import annotations

from typing import Any

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trace import Trace
from app.services.ingestion_service import import_langfuse_traces
from app.utils.langfuse_parser import parse_langfuse_export


async def import_traces(db: AsyncSession, raw_data: str | bytes) -> dict[str, Any]:
    """Import traces from a Langfuse JSON export."""
    parsed = parse_langfuse_export(raw_data)
    result = await import_langfuse_traces(
        db,
        parsed,
        source_type="langfuse_export",
        source_connection_id=None,
    )
    return {
        "imported": result["imported"],
        "skipped": result["skipped"] + result["updated"],
        "errors": result["errors"],
    }


async def list_traces(
    db: AsyncSession,
    *,
    search: str | None = None,
    tag: str | None = None,
    user_id: str | None = None,
    session_id: str | None = None,
    version: str | None = None,
    release: str | None = None,
    has_scores: bool | None = None,
    min_latency_ms: float | None = None,
    max_latency_ms: float | None = None,
    min_cost: float | None = None,
    max_cost: float | None = None,
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
            Trace.external_id.ilike(pattern),
        )
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    if tag:
        query = query.where(Trace.tags.contains(tag))
        count_query = count_query.where(Trace.tags.contains(tag))

    if user_id:
        query = query.where(Trace.user_id == user_id)
        count_query = count_query.where(Trace.user_id == user_id)

    if session_id:
        query = query.where(Trace.session_id == session_id)
        count_query = count_query.where(Trace.session_id == session_id)

    if version:
        query = query.where(Trace.version == version)
        count_query = count_query.where(Trace.version == version)

    if release:
        query = query.where(Trace.release == release)
        count_query = count_query.where(Trace.release == release)

    if has_scores is True:
        query = query.where(Trace.scores.is_not(None))
        count_query = count_query.where(Trace.scores.is_not(None))

    if has_scores is False:
        query = query.where(Trace.scores.is_(None))
        count_query = count_query.where(Trace.scores.is_(None))

    if min_latency_ms is not None:
        query = query.where(Trace.latency_ms.is_not(None), Trace.latency_ms >= min_latency_ms)
        count_query = count_query.where(Trace.latency_ms.is_not(None), Trace.latency_ms >= min_latency_ms)

    if max_latency_ms is not None:
        query = query.where(Trace.latency_ms.is_not(None), Trace.latency_ms <= max_latency_ms)
        count_query = count_query.where(Trace.latency_ms.is_not(None), Trace.latency_ms <= max_latency_ms)

    if min_cost is not None:
        query = query.where(Trace.total_cost.is_not(None), Trace.total_cost >= min_cost)
        count_query = count_query.where(Trace.total_cost.is_not(None), Trace.total_cost >= min_cost)

    if max_cost is not None:
        query = query.where(Trace.total_cost.is_not(None), Trace.total_cost <= max_cost)
        count_query = count_query.where(Trace.total_cost.is_not(None), Trace.total_cost <= max_cost)

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


async def get_traces_by_ids(db: AsyncSession, trace_ids: list[str]) -> list[Trace]:
    """Return traces for the given IDs, in arbitrary order. Missing IDs are omitted."""
    if not trace_ids:
        return []
    result = await db.execute(select(Trace).where(Trace.id.in_(trace_ids)))
    return list(result.scalars().unique().all())


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
