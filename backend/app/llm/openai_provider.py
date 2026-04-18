from __future__ import annotations

import time

from openai import AsyncOpenAI
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


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        self.client = AsyncOpenAI(api_key=get_settings().openai_api_key)

    async def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        model: str | None = None,
    ) -> LLMResponse:
        model = model or "gpt-4o-mini"
        with tracer.start_as_current_span(
            "chat openai",
            kind=SpanKind.CLIENT,
            attributes={
                "gen_ai.operation.name": "chat",
                "gen_ai.provider.name": "openai",
                "gen_ai.request.model": model,
                "gen_ai.request.temperature": temperature,
            },
        ) as span:
            set_server_attributes(span, "https://api.openai.com")
            set_input_message(span, prompt)
            start = time.perf_counter()
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                )
            except Exception as exc:
                record_span_exception(span, exc)
                raise

            elapsed_ms = (time.perf_counter() - start) * 1000
            content = response.choices[0].message.content or ""
            tokens = response.usage.total_tokens if response.usage else 0

            set_if_value(span, "gen_ai.response.id", response.id)
            set_if_value(span, "gen_ai.response.model", getattr(response, "model", None))
            if response.usage:
                set_if_value(span, "gen_ai.usage.input_tokens", response.usage.prompt_tokens)
                set_if_value(span, "gen_ai.usage.output_tokens", response.usage.completion_tokens)
            finish_reason = response.choices[0].finish_reason if response.choices else None
            if finish_reason:
                span.set_attribute("gen_ai.response.finish_reasons", [finish_reason])
            set_output_message(span, content)
            span.set_attribute("evaluator.llm.latency_ms", elapsed_ms)
            return LLMResponse(content=content, tokens_used=tokens, latency_ms=elapsed_ms)
