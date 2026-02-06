from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.eval_run import RunCreate, RunOut, RunSummary
from app.schemas.eval_result import EvalResultOut, RunResultWithTrace, TraceSummaryForResult
from app.services import run_service
from app.services import trace_service
from app.services import eval_runner
from app.models.trace import Trace

router = APIRouter(prefix="/api/runs", tags=["runs"])

PREVIEW_MAX = 120


def _preview(obj: dict | None) -> str:
    if obj is None:
        return ""
    try:
        s = json.dumps(obj, default=str)
    except Exception:
        s = str(obj)
    return s[:PREVIEW_MAX] + ("..." if len(s) > PREVIEW_MAX else "")


def _trace_summary(t: Trace) -> TraceSummaryForResult:
    return TraceSummaryForResult(
        name=t.name,
        timestamp=t.timestamp,
        imported_at=t.imported_at,
        input_preview=_preview(t.input),
        output_preview=_preview(t.output),
    )


@router.post("", response_model=RunOut, status_code=201)
async def create_run(
    data: RunCreate,
    db: AsyncSession = Depends(get_db),
):
    try:
        run = await run_service.create_run(db, data)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Kick off the background evaluation
    eval_runner.start_run(run.id)
    return RunOut.model_validate(run)


@router.get("", response_model=dict)
async def list_runs(
    eval_config_id: int | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    runs, total = await run_service.list_runs(
        db, eval_config_id=eval_config_id, offset=offset, limit=limit
    )
    return {
        "items": [RunSummary.model_validate(r) for r in runs],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{run_id}", response_model=RunOut)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")
    return RunOut.model_validate(run)


@router.get("/{run_id}/results", response_model=dict)
async def get_run_results(
    run_id: int,
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    run = await run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")

    results, total = await run_service.get_run_results(db, run_id, offset=offset, limit=limit)
    trace_ids = [r.trace_id for r in results]
    traces = await trace_service.get_traces_by_ids(db, trace_ids)
    trace_by_id = {t.id: t for t in traces}

    items = []
    for r in results:
        trace = trace_by_id.get(r.trace_id)
        summary = _trace_summary(trace) if trace else None
        items.append(
            RunResultWithTrace(
                **EvalResultOut.model_validate(r).model_dump(),
                trace_summary=summary,
            )
        )

    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.delete("/{run_id}")
async def delete_run(run_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await run_service.delete_run(db, run_id)
    if not deleted:
        raise HTTPException(404, f"Run {run_id} not found")
    return {"deleted": True}


@router.get("/{run_id}/aggregation")
async def get_run_aggregation(run_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await run_service.get_run_aggregation(db, run_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{run_id}/export")
async def export_run_results(
    run_id: int,
    format: str = Query("json"),
    db: AsyncSession = Depends(get_db),
):
    run = await run_service.get_run(db, run_id)
    if not run:
        raise HTTPException(404, f"Run {run_id} not found")

    content = await run_service.export_run_results(db, run_id, fmt=format)

    if format == "csv":
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=run_{run_id}_results.csv"},
        )
    return StreamingResponse(
        iter([content]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=run_{run_id}_results.json"},
    )


class CompareRequest(BaseModel):
    run_ids: list[int]


@router.post("/compare")
async def compare_runs(data: CompareRequest, db: AsyncSession = Depends(get_db)):
    return await run_service.compare_runs(db, data.run_ids)
