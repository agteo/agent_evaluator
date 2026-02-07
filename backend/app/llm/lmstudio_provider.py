from __future__ import annotations

import time

import httpx
from openai import AsyncOpenAI

from app.config import get_settings
from app.llm.base import LLMProvider, LLMResponse

# Local models can be slow; use a long timeout to avoid "Channel Error" / connection drop.
LMSTUDIO_TIMEOUT_SEC = 300


class LMStudioProvider(LLMProvider):
    """LMStudio exposes an OpenAI-compatible API (default http://localhost:8000/v1)."""

    def __init__(self) -> None:
        http_client = httpx.AsyncClient(timeout=LMSTUDIO_TIMEOUT_SEC)
        self.client = AsyncOpenAI(
            base_url=get_settings().lmstudio_base_url,
            api_key="lm-studio",  # LMStudio often ignores key; placeholder for client
            http_client=http_client,
        )

    async def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        model: str | None = None,
    ) -> LLMResponse:
        model = model or "gemma-3-12b-it"
        start = time.perf_counter()
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            stream=False,
            max_tokens=8192,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        content = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else 0
        return LLMResponse(content=content, tokens_used=tokens, latency_ms=elapsed_ms)
