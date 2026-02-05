from __future__ import annotations

import json
from typing import Any

from jinja2 import Environment, BaseLoader


def render_template(
    template_str: str,
    trace: dict[str, Any],
    criteria: list[dict[str, Any]],
) -> str:
    env = Environment(loader=BaseLoader(), keep_trailing_newline=True)
    tmpl = env.from_string(template_str)
    return tmpl.render(
        trace=trace,
        criteria=criteria,
        input=_format_value(trace.get("input")),
        output=_format_value(trace.get("output")),
        metadata=_format_value(trace.get("metadata_")),
    )


def _format_value(val: Any) -> str:
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    return json.dumps(val, indent=2, default=str)
