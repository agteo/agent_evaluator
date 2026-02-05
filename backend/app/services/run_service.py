from __future__ import annotations

import csv
import io
import json
import math
from datetime import datetime
from typing import Any

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eval_config import EvalConfig
from app.models.eval_run import EvalRun
from app.models.eval_result import EvalResult
from app.models.dataset import DatasetTrace
from app.models.trace import Trace
from app.schemas.eval_run import RunCreate


async def create_run(db: AsyncSession, data: RunCreate) -> EvalRun:
    config = await db.get(EvalConfig, data.eval_config_id)
    if not config:
        raise ValueError(f"Eval config {data.eval_config_id} not found")

    # Resolve trace IDs
    if data.trace_ids:
        trace_ids = data.trace_ids
    elif data.dataset_id:
        result = await db.execute(
            select(DatasetTrace.trace_id).where(DatasetTrace.dataset_id == data.dataset_id)
        )
        trace_ids = list(result.scalars().all())
        if not trace_ids:
            raise ValueError(f"Dataset {data.dataset_id} has no traces")
    else:
        # No specific traces or dataset: use all imported traces
        result = await db.execute(select(Trace.id))
        trace_ids = list(result.scalars().all())
        if not trace_ids:
            raise ValueError("No traces available. Import traces first.")

    # Snapshot the config so results are reproducible
    config_snapshot: dict[str, Any] = {
        "trace_ids": trace_ids,
        "name": config.name,
        "provider": config.provider,
        "model": config.model,
        "temperature": config.temperature,
        "prompt_template": config.prompt_template,
        "criteria": config.criteria,
        "scoring_type": config.scoring_type,
        "scale_min": config.scale_min,
        "scale_max": config.scale_max,
    }

    run = EvalRun(
        eval_config_id=data.eval_config_id,
        dataset_id=data.dataset_id,
        status="pending",
        total_traces=len(trace_ids),
        config_snapshot=config_snapshot,
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def list_runs(
    db: AsyncSession,
    *,
    eval_config_id: int | None = None,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[EvalRun], int]:
    query = select(EvalRun)
    count_query = select(func.count(EvalRun.id))

    if eval_config_id is not None:
        query = query.where(EvalRun.eval_config_id == eval_config_id)
        count_query = count_query.where(EvalRun.eval_config_id == eval_config_id)

    query = query.order_by(EvalRun.created_at.desc()).offset(offset).limit(limit)

    result = await db.execute(query)
    runs = list(result.scalars().all())

    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    return runs, total


async def get_run(db: AsyncSession, run_id: int) -> EvalRun | None:
    return await db.get(EvalRun, run_id)


async def get_run_results(
    db: AsyncSession,
    run_id: int,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[EvalResult], int]:
    query = (
        select(EvalResult)
        .where(EvalResult.run_id == run_id)
        .order_by(EvalResult.created_at.asc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(query)
    results = list(result.scalars().all())

    count_result = await db.execute(
        select(func.count(EvalResult.id)).where(EvalResult.run_id == run_id)
    )
    total = count_result.scalar() or 0

    return results, total


async def delete_run(db: AsyncSession, run_id: int) -> bool:
    run = await db.get(EvalRun, run_id)
    if not run:
        return False
    await db.execute(delete(EvalResult).where(EvalResult.run_id == run_id))
    await db.delete(run)
    await db.commit()
    return True


async def get_run_aggregation(db: AsyncSession, run_id: int) -> dict[str, Any]:
    run = await db.get(EvalRun, run_id)
    if not run:
        raise ValueError(f"Run {run_id} not found")

    result = await db.execute(
        select(EvalResult).where(EvalResult.run_id == run_id)
    )
    results = list(result.scalars().all())

    scores = [r.overall_score for r in results if r.overall_score is not None]
    n = len(scores)

    avg = sum(scores) / n if n else 0
    score_min = min(scores) if n else 0
    score_max = max(scores) if n else 0
    variance = sum((s - avg) ** 2 for s in scores) / n if n else 0
    stddev = math.sqrt(variance)

    # Histogram: 10 equal-width buckets
    snapshot = run.config_snapshot or {}
    scale_lo = snapshot.get("scale_min", 1.0)
    scale_hi = snapshot.get("scale_max", 5.0)
    num_buckets = 10
    bucket_width = (scale_hi - scale_lo) / num_buckets
    distribution = []
    for i in range(num_buckets):
        lo = scale_lo + i * bucket_width
        hi = lo + bucket_width
        label = f"{lo:.1f}-{hi:.1f}"
        count = sum(1 for s in scores if lo <= s < hi or (i == num_buckets - 1 and s == hi))
        distribution.append({"bucket": label, "count": count})

    # Criteria averages
    criteria_totals: dict[str, list[float]] = {}
    for r in results:
        if not r.criteria_scores:
            continue
        for name, val in r.criteria_scores.items():
            score_val = None
            if isinstance(val, (int, float)):
                score_val = float(val)
            elif isinstance(val, dict) and "score" in val:
                score_val = float(val["score"])
            if score_val is not None:
                criteria_totals.setdefault(name, []).append(score_val)

    criteria_averages = {
        name: sum(vals) / len(vals) for name, vals in criteria_totals.items()
    }

    return {
        "run_id": run_id,
        "total": len(results),
        "completed": run.completed_traces,
        "failed": run.failed_traces,
        "avg_score": avg,
        "score_distribution": distribution,
        "criteria_averages": criteria_averages,
        "score_min": score_min,
        "score_max": score_max,
        "score_stddev": stddev,
    }


async def compare_runs(db: AsyncSession, run_ids: list[int]) -> dict[str, Any]:
    runs_data = []
    all_trace_scores: dict[str, dict[int, float | None]] = {}

    for rid in run_ids:
        run = await db.get(EvalRun, rid)
        if not run:
            continue

        config_name = ""
        if run.config_snapshot:
            config_name = run.config_snapshot.get("name", "")

        result = await db.execute(
            select(EvalResult).where(EvalResult.run_id == rid)
        )
        results = list(result.scalars().all())

        scores = [r.overall_score for r in results if r.overall_score is not None]
        avg = sum(scores) / len(scores) if scores else None

        criteria_totals: dict[str, list[float]] = {}
        for r in results:
            if not r.criteria_scores:
                continue
            for name, val in r.criteria_scores.items():
                s = None
                if isinstance(val, (int, float)):
                    s = float(val)
                elif isinstance(val, dict) and "score" in val:
                    s = float(val["score"])
                if s is not None:
                    criteria_totals.setdefault(name, []).append(s)

        criteria_averages = {
            name: sum(vals) / len(vals) for name, vals in criteria_totals.items()
        }

        runs_data.append({
            "run_id": rid,
            "config_name": config_name,
            "avg_score": avg,
            "criteria_averages": criteria_averages,
        })

        for r in results:
            all_trace_scores.setdefault(r.trace_id, {})[rid] = r.overall_score

    trace_comparisons = [
        {"trace_id": tid, "scores": scores_map}
        for tid, scores_map in all_trace_scores.items()
    ]

    return {"runs": runs_data, "trace_comparisons": trace_comparisons}


async def export_run_results(
    db: AsyncSession, run_id: int, fmt: str = "json"
) -> str:
    result = await db.execute(
        select(EvalResult).where(EvalResult.run_id == run_id).order_by(EvalResult.created_at.asc())
    )
    results = list(result.scalars().all())

    if fmt == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        # Collect all criteria names
        criteria_names: list[str] = []
        for r in results:
            if r.criteria_scores:
                for name in r.criteria_scores:
                    if name not in criteria_names:
                        criteria_names.append(name)

        header = ["trace_id", "overall_score"] + criteria_names + ["reasoning", "error"]
        writer.writerow(header)

        for r in results:
            row = [r.trace_id, r.overall_score]
            for cn in criteria_names:
                val = None
                if r.criteria_scores and cn in r.criteria_scores:
                    v = r.criteria_scores[cn]
                    if isinstance(v, (int, float)):
                        val = v
                    elif isinstance(v, dict) and "score" in v:
                        val = v["score"]
                row.append(val)
            row.extend([r.reasoning or "", r.error or ""])
            writer.writerow(row)

        return output.getvalue()
    else:
        items = []
        for r in results:
            items.append({
                "trace_id": r.trace_id,
                "overall_score": r.overall_score,
                "criteria_scores": r.criteria_scores,
                "reasoning": r.reasoning,
                "tokens_used": r.tokens_used,
                "latency_ms": r.latency_ms,
                "error": r.error,
            })
        return json.dumps(items, indent=2, default=str)
