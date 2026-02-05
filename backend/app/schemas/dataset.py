from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class DatasetCreate(BaseModel):
    name: str
    description: str | None = None


class DatasetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class DatasetOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    version: int
    trace_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetAddTraces(BaseModel):
    trace_ids: list[str]


class DatasetRemoveTraces(BaseModel):
    trace_ids: list[str]
