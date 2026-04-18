from __future__ import annotations

import json
import logging
import os
from contextlib import contextmanager
from urllib.parse import urlparse

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.trace import Span, SpanKind, Status, StatusCode

try:
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
except ImportError:  # pragma: no cover - handled by dependency install
    OTLPSpanExporter = None  # type: ignore[assignment]


logger = logging.getLogger(__name__)

_initialized = False
_TRUE_VALUES = {"1", "true", "yes", "on"}


def setup_telemetry(service_name: str, service_version: str) -> None:
    global _initialized

    if _initialized:
        return

    provider = TracerProvider(
        resource=Resource.create(
            {
                "service.name": service_name,
                "service.version": service_version,
            }
        )
    )

    exporter_name = "none"
    try:
        span_exporter = _build_span_exporter()
        if span_exporter is not None:
            provider.add_span_processor(BatchSpanProcessor(span_exporter))
            exporter_name = span_exporter.__class__.__name__
    except Exception:
        logger.exception("Failed to configure OpenTelemetry exporter")

    trace.set_tracer_provider(provider)
    _initialized = True
    logger.info("OpenTelemetry initialized (exporter=%s)", exporter_name)


def get_tracer(name: str):
    return trace.get_tracer(name)


def capture_content_enabled() -> bool:
    return os.getenv("EVALUATOR_OTEL_CAPTURE_CONTENT", "").strip().lower() in _TRUE_VALUES


def capture_content_limit() -> int:
    raw = os.getenv("EVALUATOR_OTEL_CAPTURE_LIMIT", "4000")
    try:
        return max(0, int(raw))
    except ValueError:
        return 4000


def serialize_content(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        text = value
    else:
        try:
            text = json.dumps(value, ensure_ascii=True)
        except TypeError:
            text = str(value)
    limit = capture_content_limit()
    if limit and len(text) > limit:
        return text[:limit] + "...[truncated]"
    return text


def set_if_value(span: Span, key: str, value: object | None) -> None:
    if value is None:
        return
    if isinstance(value, str) and not value:
        return
    span.set_attribute(key, value)


def set_server_attributes(span: Span, url: str | None) -> None:
    if not url:
        return
    parsed = urlparse(url)
    if parsed.hostname:
        span.set_attribute("server.address", parsed.hostname)
    if parsed.port:
        span.set_attribute("server.port", parsed.port)


def record_span_exception(span: Span, exc: Exception) -> None:
    span.record_exception(exc)
    span.set_status(Status(StatusCode.ERROR, str(exc)))
    span.set_attribute("error.type", type(exc).__name__)


def set_input_message(span: Span, prompt: str) -> None:
    if not capture_content_enabled():
        return
    span.set_attribute(
        "gen_ai.input.messages",
        serialize_content(
            [
                {
                    "role": "user",
                    "parts": [{"type": "text", "content": prompt}],
                }
            ]
        ),
    )


def set_output_message(span: Span, content: str) -> None:
    if not capture_content_enabled():
        return
    span.set_attribute(
        "gen_ai.output.messages",
        serialize_content(
            [
                {
                    "role": "assistant",
                    "parts": [{"type": "text", "content": content}],
                }
            ]
        ),
    )


@contextmanager
def start_tool_span(tool_name: str, tool_type: str = "function"):
    tracer = get_tracer(__name__)
    with tracer.start_as_current_span(
        f"execute_tool {tool_name}",
        kind=SpanKind.INTERNAL,
        attributes={
            "gen_ai.operation.name": "execute_tool",
            "gen_ai.tool.name": tool_name,
            "gen_ai.tool.type": tool_type,
        },
    ) as span:
        yield span


def _build_span_exporter():
    if _has_otlp_endpoint():
        if OTLPSpanExporter is None:
            raise RuntimeError("OTLP exporter package is not installed")
        return OTLPSpanExporter()

    if os.getenv("EVALUATOR_OTEL_CONSOLE_EXPORTER", "").strip().lower() in _TRUE_VALUES:
        return ConsoleSpanExporter()

    return None


def _has_otlp_endpoint() -> bool:
    return any(
        os.getenv(key)
        for key in (
            "OTEL_EXPORTER_OTLP_TRACES_ENDPOINT",
            "OTEL_EXPORTER_OTLP_ENDPOINT",
        )
    )
