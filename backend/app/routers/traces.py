from __future__ import annotations

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.trace import TraceOut, TraceSummary, TraceImportResponse
from app.services import trace_service

router = APIRouter(prefix="/api/traces", tags=["traces"])


@router.post("/import", response_model=TraceImportResponse)
async def import_traces(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Import traces from a Langfuse JSON export file."""
    if not file.filename:
        raise HTTPException(400, "No file provided")

    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")

    try:
        result = await trace_service.import_traces(db, content)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return result


@router.get("", response_model=dict)
async def list_traces(
    search: str | None = Query(None),
    tag: str | None = Query(None),
    sort_by: str = Query("imported_at"),
    sort_dir: str = Query("desc"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """List traces with optional filtering and pagination."""
    traces, total = await trace_service.list_traces(
        db,
        search=search,
        tag=tag,
        sort_by=sort_by,
        sort_dir=sort_dir,
        offset=offset,
        limit=limit,
    )
    return {
        "items": [TraceSummary.model_validate(t) for t in traces],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/count")
async def trace_count(db: AsyncSession = Depends(get_db)):
    count = await trace_service.get_trace_count(db)
    return {"count": count}


@router.get("/{trace_id}", response_model=TraceOut)
async def get_trace(trace_id: str, db: AsyncSession = Depends(get_db)):
    trace = await trace_service.get_trace(db, trace_id)
    if not trace:
        raise HTTPException(404, f"Trace {trace_id} not found")
    return TraceOut.model_validate(trace)


@router.delete("/{trace_id}")
async def delete_trace(trace_id: str, db: AsyncSession = Depends(get_db)):
    deleted = await trace_service.delete_trace(db, trace_id)
    if not deleted:
        raise HTTPException(404, f"Trace {trace_id} not found")
    return {"deleted": True}
