from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class BaseConnector(ABC):
    provider: str

    @abstractmethod
    async def test_connection(self) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    async def fetch_traces(self, cursor: str | None = None) -> tuple[list[dict[str, Any]], str | None]:
        raise NotImplementedError
