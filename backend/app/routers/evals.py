from __future__ import annotations

import json
import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.llm import get_provider
from app.models.trace import Trace
from app.schemas.eval_config import EvalConfigCreate, EvalConfigUpdate, EvalConfigOut
from app.services import eval_service
from app.config import load_yaml_config
from app.services.eval_runner import PROMPT_TRUNCATED_SUFFIX, _extract_json
from app.utils.template_renderer import render_template

router = APIRouter(prefix="/api/evals", tags=["evals"])


@router.post("", response_model=EvalConfigOut, status_code=201)
async def create_eval_config(
    data: EvalConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    config = await eval_service.create_eval_config(db, data)
    return EvalConfigOut.model_validate(config)


@router.get("", response_model=dict)
async def list_eval_configs(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    configs, total = await eval_service.list_eval_configs(db, offset=offset, limit=limit)
    return {
        "items": [EvalConfigOut.model_validate(c) for c in configs],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{config_id}", response_model=EvalConfigOut)
async def get_eval_config(config_id: int, db: AsyncSession = Depends(get_db)):
    config = await eval_service.get_eval_config(db, config_id)
    if not config:
        raise HTTPException(404, f"Eval config {config_id} not found")
    return EvalConfigOut.model_validate(config)


@router.put("/{config_id}", response_model=EvalConfigOut)
async def update_eval_config(
    config_id: int,
    data: EvalConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    config = await eval_service.update_eval_config(db, config_id, data)
    if not config:
        raise HTTPException(404, f"Eval config {config_id} not found")
    return EvalConfigOut.model_validate(config)


@router.delete("/{config_id}")
async def delete_eval_config(config_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await eval_service.delete_eval_config(db, config_id)
    if not deleted:
        raise HTTPException(404, f"Eval config {config_id} not found")
    return {"deleted": True}


class TestTraceRequest(BaseModel):
    trace_id: str


@router.post("/{config_id}/test")
async def test_single_trace(
    config_id: int,
    data: TestTraceRequest,
    db: AsyncSession = Depends(get_db),
):
    config = await eval_service.get_eval_config(db, config_id)
    if not config:
        raise HTTPException(404, f"Eval config {config_id} not found")

    trace = await db.get(Trace, data.trace_id)
    if not trace:
        raise HTTPException(404, f"Trace {data.trace_id} not found")

    trace_dict: dict[str, Any] = {
        "id": trace.id,
        "name": trace.name,
        "input": trace.input,
        "output": trace.output,
        "metadata_": trace.metadata_,
        "tags": trace.tags,
        "observations": trace.observations,
        "scores": trace.scores,
    }

    try:
        runner_config = (load_yaml_config() or {}).get("eval_runner", {})
        max_trace_tokens = runner_config.get("max_trace_tokens") or 0
        max_trace_chars = int(max_trace_tokens * 1.5) if max_trace_tokens else None
        prompt = render_template(
            config.prompt_template,
            trace_dict,
            config.criteria,
            max_trace_chars=max_trace_chars,
        )
        max_prompt_chars = runner_config.get("max_prompt_chars") or 0
        max_prompt_chars = int(max_prompt_chars) if max_prompt_chars else None
        if max_prompt_chars and len(prompt) > max_prompt_chars:
            prompt = prompt[: max_prompt_chars - len(PROMPT_TRUNCATED_SUFFIX)] + PROMPT_TRUNCATED_SUFFIX
    except Exception as e:
        raise HTTPException(400, f"Template rendering error: {e}")

    try:
        provider = get_provider(config.provider)
    except ValueError as e:
        raise HTTPException(400, str(e))

    start = time.time()
    try:
        llm_response = await provider.complete(
            prompt, temperature=config.temperature, model=config.model
        )
    except Exception as e:
        logging.exception("LLM call failed (eval test)")
        raise HTTPException(502, f"LLM call failed: {e}")
    elapsed_ms = (time.time() - start) * 1000

    parsed = _extract_json(llm_response.content)

    overall_score = None
    criteria_scores = None
    reasoning = None

    if parsed:
        overall_score = parsed.get("overall_score") or parsed.get("overall")
        if isinstance(overall_score, (int, float)):
            overall_score = float(overall_score)
        else:
            overall_score = None

        criteria_scores = parsed.get("criteria_scores") or parsed.get("criteria")
        if isinstance(criteria_scores, dict):
            normalized: dict[str, Any] = {}
            for k, v in criteria_scores.items():
                if isinstance(v, (int, float)):
                    normalized[k] = {"score": float(v)}
                elif isinstance(v, dict):
                    normalized[k] = v
            criteria_scores = normalized
        else:
            criteria_scores = None

        reasoning = parsed.get("reasoning") or parsed.get("explanation", "")

    return {
        "trace_id": data.trace_id,
        "overall_score": overall_score,
        "criteria_scores": criteria_scores,
        "reasoning": reasoning,
        "raw_response": llm_response.content,
        "prompt_used": prompt,
        "tokens_used": llm_response.tokens_used,
        "latency_ms": round(elapsed_ms, 1),
    }
