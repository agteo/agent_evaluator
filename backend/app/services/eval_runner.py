from __future__ import annotations

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from opentelemetry.trace import SpanKind, Status, StatusCode

from app.config import load_yaml_config
from app.database import async_session
from app.llm import get_provider
from app.llm.base import LLMProvider
from app.models.eval_config import EvalConfig
from app.models.eval_run import EvalRun
from app.models.eval_result import EvalResult
from app.models.trace import Trace
from app.telemetry import get_tracer, record_span_exception, set_if_value
from app.utils.template_renderer import render_template

logger = logging.getLogger(__name__)
tracer = get_tracer(__name__)

# Keep references to running tasks so they aren't garbage-collected
_active_tasks: dict[int, asyncio.Task] = {}

# Serialize DB writes so one session isn't used from concurrent tasks (avoids
# "commit() can't be called here" and SQLite "database is locked").
_db_write_lock = asyncio.Lock()


def start_run(run_id: int) -> None:
    task = asyncio.create_task(_execute_run(run_id))
    _active_tasks[run_id] = task
    task.add_done_callback(lambda _: _active_tasks.pop(run_id, None))


async def _execute_run(run_id: int) -> None:
    async with async_session() as db:
        try:
            run = await db.get(EvalRun, run_id)
            if not run:
                logger.error("Run %d not found", run_id)
                return

            config = await db.get(EvalConfig, run.eval_config_id)
            if not config:
                await _fail_run(db, run, "Eval config not found")
                return

            with tracer.start_as_current_span(
                "invoke_agent evaluator.run",
                kind=SpanKind.INTERNAL,
                attributes={
                    "gen_ai.operation.name": "invoke_agent",
                    "gen_ai.provider.name": config.provider,
                    "gen_ai.agent.name": "evaluator.run",
                    "gen_ai.agent.description": "LLM-as-judge evaluation run",
                    "gen_ai.agent.version": "0.1.0",
                    "gen_ai.request.model": config.model,
                    "evaluator.run_id": run.id,
                    "evaluator.eval_config_id": config.id,
                },
            ) as span:
                set_if_value(span, "evaluator.run_name", run.name)
                set_if_value(span, "evaluator.owner", run.owner)
                set_if_value(span, "evaluator.source_label", run.source_label)
                set_if_value(span, "evaluator.prompt_version", run.prompt_version)
                set_if_value(span, "evaluator.commit_sha", run.commit_sha)
                set_if_value(span, "evaluator.dataset_id", run.dataset_id)
                set_if_value(span, "gen_ai.conversation.id", str(run.id))

                # Mark as running
                run.status = "running"
                run.started_at = datetime.utcnow()
                await db.commit()

                # Get trace IDs from snapshot
                trace_ids = run.config_snapshot.get("trace_ids", []) if run.config_snapshot else []
                if not trace_ids:
                    await _fail_run(db, run, "No trace IDs in config snapshot")
                    span.set_status(Status(StatusCode.ERROR, "No trace IDs in config snapshot"))
                    return

                # Load traces
                result = await db.execute(select(Trace).where(Trace.id.in_(trace_ids)))
                traces = list(result.scalars().all())
                if not traces:
                    await _fail_run(db, run, "No traces found for the given IDs")
                    span.set_status(Status(StatusCode.ERROR, "No traces found for the given IDs"))
                    return

                span.set_attribute("evaluator.trace_count", len(traces))
                span.set_attribute("evaluator.criteria_count", len(config.criteria or []))
                span.set_attribute("evaluator.scoring_type", config.scoring_type)

                # Update total in case some traces were missing
                run.total_traces = len(traces)
                await db.commit()

                # Get provider
                try:
                    provider = get_provider(config.provider)
                except ValueError as e:
                    await _fail_run(db, run, str(e))
                    span.set_status(Status(StatusCode.ERROR, str(e)))
                    return

                # Read concurrency settings
                yaml_config = load_yaml_config()
                runner_config = yaml_config.get("eval_runner", {})
                max_concurrency = runner_config.get("max_concurrency", 5)
                semaphore = asyncio.Semaphore(max_concurrency)

                retry_cfg = {
                    "max_attempts": runner_config.get("retry_max_attempts", 3),
                    "base_delay": runner_config.get("retry_base_delay", 1.0),
                    "max_delay": runner_config.get("retry_max_delay", 10.0),
                }
                # Trace content limit; 0 = no truncation
                max_trace_tokens = runner_config.get("max_trace_tokens") or 0
                max_trace_chars = int(max_trace_tokens * 1.5) if max_trace_tokens else None
                # Hard cap on total prompt length so no request exceeds n_ctx; 0 = no cap
                max_prompt_chars = runner_config.get("max_prompt_chars") or 0
                max_prompt_chars = int(max_prompt_chars) if max_prompt_chars else None

                # Evaluate all traces concurrently (bounded by semaphore).
                tasks = [
                    _evaluate_single_trace(
                        run.id, trace, config, provider, semaphore, retry_cfg, max_trace_chars, max_prompt_chars
                    )
                    for trace in traces
                ]
                await asyncio.gather(*tasks)

                # Refresh run to get updated counters
                await db.refresh(run)

                # Compute average score
                score_result = await db.execute(
                    select(EvalResult.overall_score)
                    .where(EvalResult.run_id == run_id)
                    .where(EvalResult.overall_score.isnot(None))
                )
                scores = [s for s in score_result.scalars().all() if s is not None]
                run.avg_score = sum(scores) / len(scores) if scores else None
                run.status = "completed"
                run.finished_at = datetime.utcnow()
                await db.commit()

                set_if_value(span, "evaluator.avg_score", run.avg_score)
                span.set_attribute("evaluator.completed_traces", run.completed_traces)
                span.set_attribute("evaluator.failed_traces", run.failed_traces)

        except Exception as e:
            logger.exception("Run %d failed with unexpected error", run_id)
            async with _db_write_lock:
                async with async_session() as err_db:
                    err_run = await err_db.get(EvalRun, run_id)
                    if err_run:
                        await _fail_run(err_db, err_run, str(e))


async def _fail_run(db: AsyncSession, run: EvalRun, message: str) -> None:
    run.status = "failed"
    run.error_message = message[:1024]
    run.finished_at = datetime.utcnow()
    await db.commit()


PROMPT_TRUNCATED_SUFFIX = "\n\n[Prompt truncated to fit context limit.]"

async def _evaluate_single_trace(
    run_id: int,
    trace: Trace,
    config: EvalConfig,
    provider: LLMProvider,
    semaphore: asyncio.Semaphore,
    retry_cfg: dict,
    max_trace_chars: int | None,
    max_prompt_chars: int | None,
) -> None:
    async with semaphore:
        with tracer.start_as_current_span(
            "invoke_agent evaluator.trace",
            kind=SpanKind.INTERNAL,
            attributes={
                "gen_ai.operation.name": "invoke_agent",
                "gen_ai.provider.name": config.provider,
                "gen_ai.agent.name": "evaluator.trace",
                "gen_ai.agent.description": "Single-trace evaluator",
                "gen_ai.request.model": config.model,
                "evaluator.run_id": run_id,
                "evaluator.trace_id": trace.id,
            },
        ) as span:
            set_if_value(span, "evaluator.trace_name", trace.name)
            set_if_value(span, "gen_ai.conversation.id", trace.session_id)
            set_if_value(span, "evaluator.trace_user_id", trace.user_id)
            set_if_value(span, "evaluator.trace_version", trace.version)
            set_if_value(span, "evaluator.trace_release", trace.release)

            # Build trace dict for template rendering
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

            # Render prompt (optionally truncate trace content to fit context)
            try:
                prompt = render_template(
                    config.prompt_template,
                    trace_dict,
                    config.criteria,
                    max_trace_chars=max_trace_chars,
                )
            except Exception as e:
                record_span_exception(span, e)
                await _save_result(run_id, trace.id, error=f"Template error: {e}", prompt_used=None)
                await _increment_counter(run_id, failed=True)
                return

            # Hard cap total prompt length so no request can exceed context (e.g. due to large template/criteria)
            if max_prompt_chars and max_prompt_chars > 0 and len(prompt) > max_prompt_chars:
                prompt = prompt[: max_prompt_chars - len(PROMPT_TRUNCATED_SUFFIX)] + PROMPT_TRUNCATED_SUFFIX
                logger.info(
                    "Run %d trace %s: prompt capped to %d chars",
                    run_id, trace.id, max_prompt_chars,
                )
                span.add_event("prompt.truncated", {"evaluator.max_prompt_chars": max_prompt_chars})

            # Call LLM with retry (log prompt size to diagnose context errors)
            prompt_chars = len(prompt)
            span.set_attribute("evaluator.prompt_chars", prompt_chars)
            logger.debug(
                "Run %d trace %s: prompt length %d chars (~%d tokens at 2 chars/token)",
                run_id, trace.id, prompt_chars, prompt_chars // 2,
            )
            try:
                llm_response = await _with_retry(
                    lambda: provider.complete(prompt, temperature=config.temperature, model=config.model),
                    **retry_cfg,
                )
            except Exception as e:
                record_span_exception(span, e)
                logger.warning(
                    "Run %d trace %s: LLM failed, prompt was %d chars (~%d tokens). Error: %s",
                    run_id, trace.id, prompt_chars, prompt_chars // 2, e,
                )
                await _save_result(run_id, trace.id, error=f"LLM error: {e}", prompt_used=prompt)
                await _increment_counter(run_id, failed=True)
                return

            span.set_attribute("gen_ai.usage.input_tokens", max(0, prompt_chars // 4))
            span.set_attribute("evaluator.llm_tokens_used", llm_response.tokens_used)
            span.set_attribute("evaluator.llm_latency_ms", llm_response.latency_ms)

            # Parse LLM response
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
                    # Normalize: ensure values are numbers or dicts with score key
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

            if overall_score is not None:
                span.set_attribute("evaluator.overall_score", overall_score)
            if criteria_scores:
                span.set_attribute("evaluator.criteria_scored", len(criteria_scores))

            await _save_result(
                run_id,
                trace.id,
                overall_score=overall_score,
                criteria_scores=criteria_scores,
                reasoning=reasoning,
                raw_response=llm_response.content,
                prompt_used=prompt,
                tokens_used=llm_response.tokens_used,
                latency_ms=llm_response.latency_ms,
            )
            await _increment_counter(run_id, failed=(overall_score is None and parsed is None))


async def _save_result(
    run_id: int,
    trace_id: str,
    *,
    overall_score: float | None = None,
    criteria_scores: dict | None = None,
    reasoning: str | None = None,
    raw_response: str | None = None,
    prompt_used: str | None = None,
    tokens_used: int | None = None,
    latency_ms: float | None = None,
    error: str | None = None,
) -> None:
    result = EvalResult(
        run_id=run_id,
        trace_id=trace_id,
        overall_score=overall_score,
        criteria_scores=criteria_scores,
        reasoning=reasoning,
        raw_response=raw_response,
        prompt_used=prompt_used,
        tokens_used=tokens_used,
        latency_ms=latency_ms,
        error=error,
    )
    async with _db_write_lock:
        async with async_session() as db:
            db.add(result)
            await db.commit()


async def _increment_counter(run_id: int, *, failed: bool = False) -> None:
    async with _db_write_lock:
        async with async_session() as db:
            if failed:
                await db.execute(
                    update(EvalRun)
                    .where(EvalRun.id == run_id)
                    .values(failed_traces=EvalRun.failed_traces + 1)
                )
            else:
                await db.execute(
                    update(EvalRun)
                    .where(EvalRun.id == run_id)
                    .values(completed_traces=EvalRun.completed_traces + 1)
                )
            await db.commit()


async def _with_retry(
    coro_factory,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 10.0,
):
    last_exc = None
    for attempt in range(max_attempts):
        try:
            return await coro_factory()
        except Exception as e:
            last_exc = e
            if attempt < max_attempts - 1:
                delay = min(base_delay * (2 ** attempt), max_delay)
                logger.warning(
                    "LLM call failed (attempt %d/%d): %s. Retrying in %.1fs...",
                    attempt + 1, max_attempts, e, delay,
                )
                await asyncio.sleep(delay)
    raise last_exc  # type: ignore[misc]


def _extract_json(text: str) -> dict | None:
    # Try raw JSON parse
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            return obj
    except (json.JSONDecodeError, TypeError):
        pass

    # Try to find JSON in markdown code blocks
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        try:
            obj = json.loads(match.group(1))
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, TypeError):
            pass

    # Try to find any JSON object substring
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            obj = json.loads(match.group(0))
            if isinstance(obj, dict):
                return obj
        except (json.JSONDecodeError, TypeError):
            pass

    return None
