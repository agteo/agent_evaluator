from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Text, DateTime, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EvalConfig(Base):
    __tablename__ = "eval_configs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider: Mapped[str] = mapped_column(String(64), nullable=False, default="openai")
    model: Mapped[str] = mapped_column(String(128), nullable=False, default="gpt-4o-mini")
    temperature: Mapped[float] = mapped_column(Float, default=0.0)
    prompt_template: Mapped[str] = mapped_column(Text, nullable=False)
    criteria: Mapped[list] = mapped_column(JSON, nullable=False)
    scoring_type: Mapped[str] = mapped_column(String(32), default="numeric")
    scale_min: Mapped[float] = mapped_column(Float, default=1.0)
    scale_max: Mapped[float] = mapped_column(Float, default=5.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
