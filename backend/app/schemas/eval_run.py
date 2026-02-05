from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RunCreate(BaseModel):
    eval_config_id: int
    trace_ids: list[str] | None = None
    dataset_id: int | None = None


class RunOut(BaseModel):
    id: int
    eval_config_id: int
    dataset_id: int | None = None
    status: str
    total_traces: int
    completed_traces: int
    failed_traces: int
    avg_score: float | None = None
    error_message: str | None = None
    config_snapshot: dict[str, Any] | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RunSummary(BaseModel):
    id: int
    eval_config_id: int
    status: str
    total_traces: int
    completed_traces: int
    failed_traces: int
    avg_score: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
