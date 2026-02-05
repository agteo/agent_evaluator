from __future__ import annotations

from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.eval_config import EvalConfig
from app.schemas.eval_config import EvalConfigCreate, EvalConfigUpdate


async def create_eval_config(db: AsyncSession, data: EvalConfigCreate) -> EvalConfig:
    config = EvalConfig(
        name=data.name,
        description=data.description,
        provider=data.provider,
        model=data.model,
        temperature=data.temperature,
        prompt_template=data.prompt_template,
        criteria=[c.model_dump() for c in data.criteria],
        scoring_type=data.scoring_type,
        scale_min=data.scale_min,
        scale_max=data.scale_max,
    )
    db.add(config)
    await db.commit()
    await db.refresh(config)
    return config


async def list_eval_configs(
    db: AsyncSession,
    *,
    offset: int = 0,
    limit: int = 50,
) -> tuple[list[EvalConfig], int]:
    query = select(EvalConfig).order_by(EvalConfig.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    configs = list(result.scalars().all())

    count_result = await db.execute(select(func.count(EvalConfig.id)))
    total = count_result.scalar() or 0

    return configs, total


async def get_eval_config(db: AsyncSession, config_id: int) -> EvalConfig | None:
    return await db.get(EvalConfig, config_id)


async def update_eval_config(
    db: AsyncSession, config_id: int, data: EvalConfigUpdate
) -> EvalConfig | None:
    config = await db.get(EvalConfig, config_id)
    if not config:
        return None

    updates = data.model_dump(exclude_unset=True)
    if "criteria" in updates and updates["criteria"] is not None:
        updates["criteria"] = [c.model_dump() for c in data.criteria]

    for key, value in updates.items():
        setattr(config, key, value)

    config.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(config)
    return config


async def delete_eval_config(db: AsyncSession, config_id: int) -> bool:
    config = await db.get(EvalConfig, config_id)
    if not config:
        return False
    await db.delete(config)
    await db.commit()
    return True
