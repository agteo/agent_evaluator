from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import init_db
from app.routers import traces, evals, runs, datasets, connections
from app.telemetry import setup_telemetry


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_telemetry(settings.otel_service_name, settings.otel_service_version)
    await init_db()
    yield


app = FastAPI(title="Evaluator", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(traces.router)
app.include_router(evals.router)
app.include_router(runs.router)
app.include_router(datasets.router)
app.include_router(connections.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
