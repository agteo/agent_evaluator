from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TraceOut(BaseModel):
    id: str
    source_type: str | None = None
    source_connection_id: int | None = None
    external_id: str | None = None
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
    source_type: str | None = None
    source_connection_id: int | None = None
    external_id: str | None = None
    name: str | None = None
    tags: list[str] | None = None
    total_cost: float | None = None
    latency_ms: float | None = None
    timestamp: datetime | None = None
    imported_at: datetime

    model_config = {"from_attributes": True}


def _preview(obj: dict | None, max_len: int = 100) -> str:
    if obj is None:
        return ""
    try:
        import json
        s = json.dumps(obj, default=str)
    except Exception:
        s = str(obj)
    return s[:max_len] + ("..." if len(s) > max_len else "")


class TraceSummaryWithPreview(TraceSummary):
    """Trace list item with truncated input/output for table preview."""
    input_preview: str = ""
    output_preview: str = ""


class TraceImportResponse(BaseModel):
    imported: int
    skipped: int
    errors: list[str]
