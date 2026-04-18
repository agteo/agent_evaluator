from __future__ import annotations

import hashlib
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.trace import Trace
from app.utils.langfuse_parser import normalize_langfuse_trace


def build_trace_id(source_type: str, source_connection_id: int | None, external_id: str) -> str:
    if source_connection_id is None:
        return external_id
    digest = hashlib.sha1(f"{source_type}:{source_connection_id}:{external_id}".encode("utf-8")).hexdigest()
    return f"trc_{digest[:24]}"


async def import_langfuse_traces(
    db: AsyncSession,
    traces: list[dict[str, Any]],
    *,
    source_type: str,
    source_connection_id: int | None,
) -> dict[str, Any]:
    imported = 0
    updated = 0
    skipped = 0
    errors: list[str] = []

    for raw_trace in traces:
        try:
            normalized = normalize_langfuse_trace(raw_trace)
            external_id = normalized["external_id"]
            existing = await _find_existing_trace(db, external_id, source_connection_id)

            if existing:
                if _apply_trace_updates(existing, normalized, source_type, source_connection_id):
                    updated += 1
                else:
                    skipped += 1
                continue

            trace = Trace(
                id=build_trace_id(source_type, source_connection_id, external_id),
                source_type=source_type,
                source_connection_id=source_connection_id,
                external_id=external_id,
                **normalized["trace_fields"],
            )
            db.add(trace)
            imported += 1
        except Exception as exc:
            trace_id = raw_trace.get("id") or raw_trace.get("traceId") or "unknown"
            errors.append(f"Trace {trace_id}: {exc}")

    if imported > 0 or updated > 0:
        await db.commit()

    return {
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }


async def _find_existing_trace(
    db: AsyncSession,
    external_id: str,
    source_connection_id: int | None,
) -> Trace | None:
    if source_connection_id is None:
        return await db.get(Trace, external_id)

    result = await db.execute(
        select(Trace).where(
            Trace.source_connection_id == source_connection_id,
            Trace.external_id == external_id,
        )
    )
    return result.scalar_one_or_none()


def _apply_trace_updates(
    trace: Trace,
    normalized: dict[str, Any],
    source_type: str,
    source_connection_id: int | None,
) -> bool:
    changed = False
    trace_fields = normalized["trace_fields"]

    if trace.source_type != source_type:
        trace.source_type = source_type
        changed = True
    if trace.source_connection_id != source_connection_id:
        trace.source_connection_id = source_connection_id
        changed = True
    if trace.external_id != normalized["external_id"]:
        trace.external_id = normalized["external_id"]
        changed = True

    for key, value in trace_fields.items():
        if getattr(trace, key) != value:
            setattr(trace, key, value)
            changed = True

    return changed
