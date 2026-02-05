from __future__ import annotations

import time

import anthropic

from app.config import get_settings
from app.llm.base import LLMProvider, LLMResponse


class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=get_settings().anthropic_api_key)

    async def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        model: str | None = None,
    ) -> LLMResponse:
        model = model or "claude-3-haiku-20240307"
        start = time.perf_counter()
        response = await self.client.messages.create(
            model=model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
        )
        elapsed_ms = (time.perf_counter() - start) * 1000
        content = response.content[0].text if response.content else ""
        tokens = (response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0
        return LLMResponse(content=content, tokens_used=tokens, latency_ms=elapsed_ms)
