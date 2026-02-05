from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TraceOut(BaseModel):
    id: str
    name: str | None = None
    input: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    metadata_: dict[str, Any] | None = None
    tags: list[str] | None = None
    observations: list[Any] | None = None
    scores: dict[str, Any] | None = None
    total_cost: float | None = None
    latency_ms: float | None = None
    session_id: str | None = None
    user_id: str | None = None
    version: str | None = None
    release: str | None = None
    timestamp: datetime | None = None
    imported_at: datetime

    model_config = {"from_attributes": True}


class TraceSummary(BaseModel):
    id: str
    name: str | None = None
    tags: list[str] | None = None
    total_cost: float | None = None
    latency_ms: float | None = None
    timestamp: datetime | None = None
    imported_at: datetime

    model_config = {"from_attributes": True}


class TraceImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
