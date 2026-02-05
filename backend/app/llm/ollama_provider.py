from __future__ import annotations

import time

import httpx

from app.config import get_settings
from app.llm.base import LLMProvider, LLMResponse


class OllamaProvider(LLMProvider):
    def __init__(self) -> None:
        self.base_url = get_settings().ollama_base_url

    async def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        model: str | None = None,
    ) -> LLMResponse:
        model = model or "llama3.1"
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": temperature},
                },
            )
            resp.raise_for_status()
            data = resp.json()
        elapsed_ms = (time.perf_counter() - start) * 1000
        content = data.get("message", {}).get("content", "")
        tokens = data.get("eval_count", 0) + data.get("prompt_eval_count", 0)
        return LLMResponse(content=content, tokens_used=tokens, latency_ms=elapsed_ms)
