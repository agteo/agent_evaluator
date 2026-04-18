from __future__ import annotations

import time

import httpx
from opentelemetry.trace import SpanKind

from app.config import get_settings
from app.llm.base import LLMProvider, LLMResponse
from app.telemetry import (
    get_tracer,
    record_span_exception,
    set_if_value,
    set_input_message,
    set_output_message,
    set_server_attributes,
)


tracer = get_tracer(__name__)


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
        with tracer.start_as_current_span(
            "chat ollama",
            kind=SpanKind.CLIENT,
            attributes={
                "gen_ai.operation.name": "chat",
                "gen_ai.provider.name": "ollama",
                "gen_ai.request.model": model,
                "gen_ai.request.temperature": temperature,
            },
        ) as span:
            set_server_attributes(span, self.base_url)
            set_input_message(span, prompt)
            start = time.perf_counter()
            try:
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
            except Exception as exc:
                record_span_exception(span, exc)
                raise

            elapsed_ms = (time.perf_counter() - start) * 1000
            content = data.get("message", {}).get("content", "")
            prompt_tokens = data.get("prompt_eval_count", 0)
            output_tokens = data.get("eval_count", 0)
            tokens = output_tokens + prompt_tokens

            set_if_value(span, "gen_ai.response.model", data.get("model"))
            set_if_value(span, "gen_ai.usage.input_tokens", prompt_tokens)
            set_if_value(span, "gen_ai.usage.output_tokens", output_tokens)
            set_output_message(span, content)
            span.set_attribute("evaluator.llm.latency_ms", elapsed_ms)
            return LLMResponse(content=content, tokens_used=tokens, latency_ms=elapsed_ms)
