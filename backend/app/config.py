from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache

import yaml
from pydantic_settings import BaseSettings
from pydantic import Field


_BACKEND = Path(__file__).resolve().parent.parent  # backend/
_PROJECT = _BACKEND.parent  # Evaluator/


class Settings(BaseSettings):
    database_url: str = Field(
        default=f"sqlite+aiosqlite:///{(_PROJECT / 'data' / 'evaluator.db').as_posix()}"
    )
    otel_service_name: str = "evaluator-backend"
    otel_service_version: str = "0.1.0"
    sync_worker_poll_interval_seconds: int = 30
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"
    lmstudio_base_url: str = "http://localhost:1234/v1"

    model_config = {
        "env_file": [str(_PROJECT / ".env"), str(_BACKEND / ".env")],
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def load_yaml_config() -> dict:
    config_path = _BACKEND / "config.yaml"
    if config_path.exists():
        with open(config_path) as f:
            return yaml.safe_load(f) or {}
    return {}
