# Evaluator Platform

Generic web-based evaluation platform for Langfuse trace exports with LLM-as-judge evaluations.

## Quick Start

The virtual environment lives at the **project root** (`.venv/`), not inside `backend/`.

```bash
# From the Evaluator/ root:
.venv\Scripts\activate        # Windows CMD
npm run dev                   # Launches both backend + frontend
```

Or run `start.bat` to launch both in separate windows.

## Architecture
- **Backend**: Python FastAPI + SQLAlchemy 2.0 (async) + SQLite
- **Frontend**: React + TypeScript (Vite) + Tailwind CSS + TanStack Query
- **LLM Providers**: OpenAI, Anthropic, Ollama

## Project Layout
- `.venv/` - Python virtual environment (root-level, gitignored)
- `.env` - API keys (root-level, gitignored)
- `backend/app/` - FastAPI application
  - `models/` - SQLAlchemy ORM models
  - `schemas/` - Pydantic request/response schemas
  - `routers/` - API route handlers
  - `services/` - Business logic
  - `llm/` - LLM provider abstraction
  - `utils/` - Langfuse parser, template renderer, retry logic
- `frontend/src/` - React application
  - `api/` - Axios HTTP client
  - `types/` - TypeScript interfaces
  - `hooks/` - TanStack Query hooks
  - `pages/` - Route pages
  - `components/` - Reusable UI components
- `data/` - SQLite database (gitignored)

## Implementation Status

### Done
- **Phase 1 - Foundation**: FastAPI skeleton, SQLAlchemy models (Trace, EvalConfig, EvalRun, EvalResult, Dataset, DatasetTrace), database auto-init, health endpoint, Vite+React scaffold, Tailwind CSS, React Router with sidebar layout, TypeScript types, Axios client
- **Phase 2 - Data Import + Trace Browsing**: Langfuse JSON/JSONL parser, trace import endpoint (POST /api/traces/import), trace list with filtering/sorting/pagination, trace detail endpoint, drag-and-drop upload UI, trace table with pagination, trace detail page with JSON viewer
- **Phase 3 - Evaluation Configuration**: Eval config CRUD endpoints (backend/app/services/eval_service.py, backend/app/routers/evals.py). Frontend: EvalsPage with config list table, EvalConfigPage with react-hook-form, dynamic criteria cards (useFieldArray), prompt template editor (react-simple-code-editor + prismjs Jinja2 highlighting), provider/model selector, scoring settings.
- **Phase 4 - LLM Providers + Eval Runner**: LLM provider abstraction (backend/app/llm/base.py) with OpenAI, Anthropic, Ollama implementations and factory pattern. Jinja2 template renderer (backend/app/utils/template_renderer.py). Eval runner (backend/app/services/eval_runner.py) with asyncio background tasks, semaphore concurrency (default 5), exponential backoff retry, JSON response extraction. Run service (backend/app/services/run_service.py) with CRUD and config snapshot. Frontend: RunsPage with launch modal (config/dataset selectors), RunDetailPage with 2s polling progress bar, expandable results table.
- **Phase 5 - Results Dashboard + Visualizations**: Backend aggregation endpoint (score stats, histogram, criteria averages), run comparison endpoint, CSV/JSON export via StreamingResponse. Frontend: Recharts BarChart for score distribution and criteria averages, stats summary cards (mean/min/max/stddev), export JSON/CSV buttons on RunDetailPage.
- **Phase 6 - Dataset Management**: Dataset CRUD endpoints with trace add/remove and version bumping. Frontend: DatasetsPage with inline create form, DatasetDetailPage with trace list and add-traces panel (checkbox selector with search).

### Remaining
- **Phase 7 - Polish + Sample Data**: Sample Langfuse JSON file for testing, "test single trace" feature on eval config page, error/empty/loading skeleton states throughout, final README updates.
