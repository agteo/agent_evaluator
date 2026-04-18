from __future__ import annotations

import time

import anthropic
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
        with tracer.start_as_current_span(
            "chat anthropic",
            kind=SpanKind.CLIENT,
            attributes={
                "gen_ai.operation.name": "chat",
                "gen_ai.provider.name": "anthropic",
                "gen_ai.request.model": model,
                "gen_ai.request.temperature": temperature,
                "gen_ai.request.max_tokens": 2048,
            },
        ) as span:
            set_server_attributes(span, "https://api.anthropic.com")
            set_input_message(span, prompt)
            start = time.perf_counter()
            try:
                response = await self.client.messages.create(
                    model=model,
                    max_tokens=2048,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                )
            except Exception as exc:
                record_span_exception(span, exc)
                raise

            elapsed_ms = (time.perf_counter() - start) * 1000
            content = response.content[0].text if response.content else ""
            tokens = (response.usage.input_tokens + response.usage.output_tokens) if response.usage else 0

            set_if_value(span, "gen_ai.response.id", getattr(response, "id", None))
            set_if_value(span, "gen_ai.response.model", getattr(response, "model", None))
            if response.usage:
                set_if_value(span, "gen_ai.usage.input_tokens", response.usage.input_tokens)
                set_if_value(span, "gen_ai.usage.output_tokens", response.usage.output_tokens)
            stop_reason = getattr(response, "stop_reason", None)
            if stop_reason:
                span.set_attribute("gen_ai.response.finish_reasons", [stop_reason])
            set_output_message(span, content)
            span.set_attribute("evaluator.llm.latency_ms", elapsed_ms)
            return LLMResponse(content=content, tokens_used=tokens, latency_ms=elapsed_ms)
