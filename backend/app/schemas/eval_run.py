from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RunCreate(BaseModel):
    eval_config_id: int
    trace_ids: list[str] | None = None
    dataset_id: int | None = None
    name: str | None = None
    description: str | None = None
    owner: str | None = None
    tags: list[str] | None = None
    source_label: str | None = None
    prompt_version: str | None = None
    commit_sha: str | None = None
    baseline_run_id: int | None = None


class RunOut(BaseModel):
    id: int
    eval_config_id: int
    name: str | None = None
    description: str | None = None
    owner: str | None = None
    tags: list[str] | None = None
    source_label: str | None = None
    prompt_version: str | None = None
    commit_sha: str | None = None
    baseline_run_id: int | None = None
    dataset_id: int | None = None
    config_name: str | None = None
    dataset_name: str | None = None
    baseline_run_name: str | None = None
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
    name: str | None = None
    owner: str | None = None
    tags: list[str] | None = None
    source_label: str | None = None
    prompt_version: str | None = None
    commit_sha: str | None = None
    baseline_run_id: int | None = None
    dataset_id: int | None = None
    config_name: str | None = None
    dataset_name: str | None = None
    baseline_run_name: str | None = None
    status: str
    total_traces: int
    completed_traces: int
    failed_traces: int
    avg_score: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
