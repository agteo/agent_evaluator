from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class EvalResultOut(BaseModel):
    id: int
    run_id: int
    trace_id: str
    overall_score: float | None = None
    criteria_scores: dict[str, Any] | None = None
    reasoning: str | None = None
    raw_response: str | None = None
    prompt_used: str | None = None
    tokens_used: int | None = None
    latency_ms: float | None = None
    error: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
