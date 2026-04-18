from __future__ import annotations

import json
from datetime import datetime
from typing import Any


def parse_langfuse_export(raw: str | bytes) -> list[dict[str, Any]]:
    """Parse a Langfuse JSON export into a list of normalized trace dicts.

    Supports:
    - Array of trace objects: [{"id": ..., "input": ...}, ...]
    - Single trace object: {"id": ..., "input": ...}
    - JSONL (one JSON object per line)
    - Nested export: {"data": [...]} or {"traces": [...]}
    """
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8")

    raw = raw.strip()

    # Try standard JSON first
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Try JSONL
        traces = []
        for i, line in enumerate(raw.splitlines()):
            line = line.strip()
            if not line:
                continue
            try:
                traces.append(json.loads(line))
            except json.JSONDecodeError:
                continue
        if traces:
            return [_normalize_trace(t) for t in traces]
        raise ValueError("Could not parse file as JSON or JSONL")

    # Handle different shapes
    if isinstance(data, list):
        return [_normalize_trace(t) for t in data]
    if isinstance(data, dict):
        # Nested under a key
        for key in ("data", "traces", "items", "results"):
            if key in data and isinstance(data[key], list):
                return [_normalize_trace(t) for t in data[key]]
        # Single trace
        return [_normalize_trace(data)]

    raise ValueError(f"Unexpected JSON type: {type(data).__name__}")


def normalize_langfuse_trace(obj: dict[str, Any]) -> dict[str, Any]:
    """Normalize a single trace object to our schema."""
    trace_id = obj.get("id") or obj.get("traceId") or obj.get("trace_id")
    if not trace_id:
        raise ValueError(f"Trace missing 'id' field: {list(obj.keys())[:5]}")

    timestamp = obj.get("timestamp") or obj.get("createdAt") or obj.get("created_at")
    if isinstance(timestamp, str):
        try:
            timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            timestamp = None

    # Extract input/output - handle both string and dict forms
    input_val = _ensure_dict("input", obj.get("input"))
    output_val = _ensure_dict("output", obj.get("output"))

    # Compute latency from observations if not directly available
    latency = obj.get("latency") or obj.get("latencyMs") or obj.get("latency_ms")
    total_cost = obj.get("totalCost") or obj.get("total_cost") or obj.get("calculatedTotalCost")

    return {
        "external_id": str(trace_id),
        "trace_fields": {
            "name": obj.get("name"),
            "input": input_val,
            "output": output_val,
            "metadata_": obj.get("metadata") or obj.get("meta"),
            "tags": obj.get("tags"),
            "observations": obj.get("observations"),
            "scores": _extract_scores(obj),
            "total_cost": float(total_cost) if total_cost is not None else None,
            "latency_ms": float(latency) if latency is not None else None,
            "session_id": obj.get("sessionId") or obj.get("session_id"),
            "user_id": obj.get("userId") or obj.get("user_id"),
            "version": obj.get("version"),
            "release": obj.get("release"),
            "timestamp": timestamp,
            "raw_json": json.dumps(obj),
        },
    }


def _normalize_trace(obj: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_langfuse_trace(obj)
    return {
        "id": normalized["external_id"],
        **normalized["trace_fields"],
    }


def _ensure_dict(label: str, value: Any) -> dict | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return {"text": value}
    if isinstance(value, list):
        return {"items": value}
    return {"value": value}


def _extract_scores(obj: dict[str, Any]) -> dict | None:
    scores = obj.get("scores")
    if scores is None:
        return None
    if isinstance(scores, dict):
        return scores
    if isinstance(scores, list):
        result = {}
        for s in scores:
            if isinstance(s, dict) and "name" in s:
                result[s["name"]] = s.get("value", s.get("score"))
        return result or None
    return None
