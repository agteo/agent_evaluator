from __future__ import annotations

import json
from typing import Any

from jinja2 import Environment, BaseLoader

TRUNCATED_SUFFIX = "\n\n[... truncated for context limit ...]"
TRUNCATED_MIDDLE = "\n\n[... middle omitted ...]\n\n"


def render_template(
    template_str: str,
    trace: dict[str, Any],
    criteria: list[dict[str, Any]],
    *,
    max_trace_chars: int | None = None,
) -> str:
    env = Environment(loader=BaseLoader(), keep_trailing_newline=True)
    tmpl = env.from_string(template_str)
    input_str = _format_value(trace.get("input"))
    output_str = _format_value(trace.get("output"))
    metadata_str = _format_value(trace.get("metadata_"))
    observations_str = _format_value(trace.get("observations"))

    if max_trace_chars and max_trace_chars > 0:
        input_str, output_str, metadata_str, observations_str = _truncate_trace_content(
            input_str, output_str, metadata_str, observations_str, max_trace_chars
        )
        # So {{ trace.input }}, {{ trace.observations }} etc. all see truncated content
        trace = {
            **trace,
            "input": input_str,
            "output": output_str,
            "metadata_": metadata_str,
            "observations": observations_str,
        }

    return tmpl.render(
        trace=trace,
        criteria=criteria,
        input=input_str,
        output=output_str,
        metadata=metadata_str,
        observations=observations_str,
    )


def _format_value(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    return json.dumps(val, indent=2, default=str)


def _truncate_trace_content(
    input_str: str,
    output_str: str,
    metadata_str: str,
    observations_str: str,
    max_chars: int,
) -> tuple[str, str, str, str]:
    """Truncate so total length <= max_chars. Order: input, output, metadata, observations."""
    suffix_len = len(TRUNCATED_SUFFIX)
    budget = max_chars - 4 * suffix_len
    if budget <= 0:
        empty = TRUNCATED_SUFFIX.strip()
        return empty, empty, empty, empty

    total = len(input_str) + len(output_str) + len(metadata_str) + len(observations_str)
    if total <= budget:
        return input_str, output_str, metadata_str, observations_str

    def cap(s: str, allowed: int) -> str:
        if allowed <= 0:
            return TRUNCATED_SUFFIX.strip()
        if len(s) <= allowed:
            return s
        return s[: allowed - suffix_len].rstrip() + TRUNCATED_SUFFIX

    remaining = budget
    input_allowed = min(len(input_str), remaining)
    out_input = cap(input_str, input_allowed)
    remaining -= len(out_input)
    if remaining <= 0:
        return out_input, TRUNCATED_SUFFIX.strip(), TRUNCATED_SUFFIX.strip(), TRUNCATED_SUFFIX.strip()
    output_allowed = min(len(output_str), remaining)
    out_output = cap(output_str, output_allowed)
    remaining -= len(out_output)
    if remaining <= 0:
        return out_input, out_output, TRUNCATED_SUFFIX.strip(), TRUNCATED_SUFFIX.strip()
    metadata_allowed = min(len(metadata_str), remaining)
    out_metadata = cap(metadata_str, metadata_allowed)
    remaining -= len(out_metadata)
    if remaining <= 0:
        return out_input, out_output, out_metadata, TRUNCATED_SUFFIX.strip()
    out_observations = cap(observations_str, remaining)
    return out_input, out_output, out_metadata, out_observations
