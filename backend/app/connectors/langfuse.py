from __future__ import annotations

from typing import Any

import httpx

from app.connectors.base import BaseConnector


class LangfuseConnector(BaseConnector):
    provider = "langfuse_api"

    def __init__(self, *, base_url: str, public_key: str, secret_key: str, batch_size: int = 50) -> None:
        self.base_url = base_url.rstrip("/")
        self.public_key = public_key
        self.secret_key = secret_key
        self.batch_size = batch_size
        self.api_base = f"{self.base_url}/api/public"

    async def test_connection(self) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.get(f"{self.api_base}/projects")
            response.raise_for_status()
            data = response.json()

        projects = data if isinstance(data, list) else data.get("data") or data.get("projects") or []
        project_count = len(projects) if isinstance(projects, list) else 0
        return {"project_count": project_count}

    async def fetch_traces(self, cursor: str | None = None) -> tuple[list[dict[str, Any]], str | None]:
        async with self._client() as client:
            listing = await self._fetch_trace_listing(client, cursor)
            summaries, next_cursor = self._extract_listing(listing)
            trace_ids = [str(item.get("id")) for item in summaries if item.get("id")]

            traces: list[dict[str, Any]] = []
            for trace_id in trace_ids:
                detail = await self._fetch_trace_detail(client, trace_id)
                traces.append(detail)

        return traces, next_cursor

    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            auth=(self.public_key, self.secret_key),
            timeout=30,
        )

    async def _fetch_trace_listing(self, client: httpx.AsyncClient, cursor: str | None) -> dict[str, Any] | list[Any]:
        params: dict[str, Any] = {"limit": self.batch_size}
        if cursor:
            params["cursor"] = cursor

        responses: list[httpx.Response] = []
        for path in ("/traces", "/trace"):
            response = await client.get(f"{self.api_base}{path}", params=params)
            responses.append(response)
            if response.status_code < 400:
                return response.json()

        responses[-1].raise_for_status()
        return []

    async def _fetch_trace_detail(self, client: httpx.AsyncClient, trace_id: str) -> dict[str, Any]:
        responses: list[httpx.Response] = []
        for path in (f"/traces/{trace_id}", f"/trace/{trace_id}"):
            response = await client.get(f"{self.api_base}{path}")
            responses.append(response)
            if response.status_code < 400:
                data = response.json()
                if isinstance(data, dict) and "data" in data and isinstance(data["data"], dict):
                    return data["data"]
                return data

        responses[-1].raise_for_status()
        return {}

    def _extract_listing(self, data: dict[str, Any] | list[Any]) -> tuple[list[dict[str, Any]], str | None]:
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)], None

        items = data.get("data") or data.get("traces") or data.get("items") or []
        if not isinstance(items, list):
            items = []

        meta = data.get("meta") if isinstance(data.get("meta"), dict) else {}
        next_cursor = (
            data.get("nextCursor")
            or data.get("next_cursor")
            or meta.get("nextCursor")
            or meta.get("next_cursor")
        )
        return [item for item in items if isinstance(item, dict)], next_cursor
