from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.eval_config import EvalConfigCreate, EvalConfigUpdate, EvalConfigOut
from app.services import eval_service

router = APIRouter(prefix="/api/evals", tags=["evals"])


@router.post("", response_model=EvalConfigOut, status_code=201)
async def create_eval_config(
    data: EvalConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    config = await eval_service.create_eval_config(db, data)
    return EvalConfigOut.model_validate(config)


@router.get("", response_model=dict)
async def list_eval_configs(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    configs, total = await eval_service.list_eval_configs(db, offset=offset, limit=limit)
    return {
        "items": [EvalConfigOut.model_validate(c) for c in configs],
        "total": total,
        "offset": offset,
        "limit": limit,
    }


@router.get("/{config_id}", response_model=EvalConfigOut)
async def get_eval_config(config_id: int, db: AsyncSession = Depends(get_db)):
    config = await eval_service.get_eval_config(db, config_id)
    if not config:
        raise HTTPException(404, f"Eval config {config_id} not found")
    return EvalConfigOut.model_validate(config)


@router.put("/{config_id}", response_model=EvalConfigOut)
async def update_eval_config(
    config_id: int,
    data: EvalConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    config = await eval_service.update_eval_config(db, config_id, data)
    if not config:
        raise HTTPException(404, f"Eval config {config_id} not found")
    return EvalConfigOut.model_validate(config)


@router.delete("/{config_id}")
async def delete_eval_config(config_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await eval_service.delete_eval_config(db, config_id)
    if not deleted:
        raise HTTPException(404, f"Eval config {config_id} not found")
    return {"deleted": True}
