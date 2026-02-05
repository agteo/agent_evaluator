from __future__ import annotations

from app.llm.base import LLMProvider, LLMResponse
from app.llm.openai_provider import OpenAIProvider
from app.llm.anthropic_provider import AnthropicProvider
from app.llm.ollama_provider import OllamaProvider

__all__ = ["LLMProvider", "LLMResponse", "get_provider"]

_providers: dict[str, type[LLMProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "ollama": OllamaProvider,
}


def get_provider(name: str) -> LLMProvider:
    cls = _providers.get(name)
    if cls is None:
        raise ValueError(f"Unknown LLM provider: {name}. Available: {list(_providers.keys())}")
    return cls()
