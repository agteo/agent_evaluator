from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Criterion(BaseModel):
    name: str
    description: str
    weight: float = 1.0


class EvalConfigCreate(BaseModel):
    name: str
    description: str | None = None
    provider: str = "openai"
    model: str = "gpt-4o-mini"
    temperature: float = 0.0
    prompt_template: str
    criteria: list[Criterion]
    scoring_type: str = "numeric"
    scale_min: float = 1.0
    scale_max: float = 5.0


class EvalConfigUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    provider: str | None = None
    model: str | None = None
    temperature: float | None = None
    prompt_template: str | None = None
    criteria: list[Criterion] | None = None
    scoring_type: str | None = None
    scale_min: float | None = None
    scale_max: float | None = None


class EvalConfigOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    provider: str
    model: str
    temperature: float
    prompt_template: str
    criteria: list[dict[str, Any]]
    scoring_type: str
    scale_min: float
    scale_max: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
