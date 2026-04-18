from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, SecretStr


ProviderType = Literal["langfuse_api"]


class LangfuseApiConfigIn(BaseModel):
    base_url: str
    public_key: str
    secret_key: SecretStr
    batch_size: int = Field(default=50, ge=1, le=200)


class LangfuseApiConfigOut(BaseModel):
    base_url: str
    public_key: str
    has_secret_key: bool = True
    batch_size: int = 50


class ConnectionCreate(BaseModel):
    name: str
    provider: ProviderType
    config: LangfuseApiConfigIn
    schedule_enabled: bool = False
    sync_interval_minutes: int | None = Field(default=None, ge=1)


class ConnectionUpdate(BaseModel):
    name: str | None = None
    config: LangfuseApiConfigIn | None = None
    schedule_enabled: bool | None = None
    sync_interval_minutes: int | None = Field(default=None, ge=1)
    status: str | None = None


class ConnectionOut(BaseModel):
    id: int
    name: str
    provider: str
    status: str
    config: dict[str, Any]
    schedule_enabled: bool
    sync_interval_minutes: int | None = None
    last_sync_at: datetime | None = None
    last_cursor: str | None = None
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConnectionTestResult(BaseModel):
    ok: bool
    provider: str
    details: dict[str, Any] = Field(default_factory=dict)


class ConnectionSyncRunOut(BaseModel):
    id: int
    connection_id: int
    trigger_mode: str
    status: str
    imported: int
    updated: int
    skipped: int
    error_count: int
    errors: list[str] | None = None
    details: dict[str, Any] | None = None
    error_message: str | None = None
    started_at: datetime
    finished_at: datetime | None = None

    model_config = {"from_attributes": True}


class ConnectionDeleteResult(BaseModel):
    deleted: bool
