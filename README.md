# Evaluator

A generic web-based evaluation platform for importing Langfuse trace exports, configuring custom rubrics, running LLM-as-judge evaluations, and visualizing results.

## Prerequisites

- **Python 3.11+** (check with `python --version`)
- **Node.js 18+** (check with `node --version`)
- At least one LLM provider API key (OpenAI, Anthropic) or a running Ollama instance

## Quick Start (Windows)

### Option A: Automated Setup

```
setup.bat          # First time only - creates venv, installs everything
start.bat          # Launches both backend and frontend
```

### Option B: Manual Setup

Everything runs from the **project root directory** (`Evaluator/`).

#### 1. Create and activate the virtual environment

```bash
# From the Evaluator/ root directory:
python -m venv .venv

# Activate it:
# Windows (Command Prompt):
.venv\Scripts\activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Git Bash):
source .venv/Scripts/activate
```

You should see `(.venv)` in your terminal prompt when activated.

#### 2. Install Python dependencies

```bash
pip install -r backend\requirements.txt
```

#### 3. Set up environment variables

```bash
copy .env.example .env
```

Edit `.env` and add your API keys:
```
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

#### 4. Start the backend

```bash
cd backend
uvicorn app.main:app --reload
```

The backend runs at **http://localhost:8000**.
Swagger API docs at **http://localhost:8000/docs**.

#### 5. Start the frontend (separate terminal)

```bash
cd frontend
npm install          # First time only
npm run dev
```

The frontend runs at **http://localhost:5173**.
API requests are automatically proxied to the backend.

#### 6. Open the app

Navigate to **http://localhost:5173** in your browser.

## Project Structure

```
Evaluator/
├── .venv/                       # Python virtual environment (root-level)
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── config.py            # Settings & YAML config loader
│   │   ├── database.py          # SQLAlchemy async engine/session
│   │   ├── models/              # SQLAlchemy ORM models
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── routers/             # API route handlers
│   │   ├── services/            # Business logic
│   │   ├── llm/                 # LLM provider abstraction
│   │   └── utils/               # Langfuse parser, template renderer
│   ├── config.yaml              # LLM rate limits & runner config
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router & layout
│   │   ├── api/                 # Axios HTTP client
│   │   ├── types/               # TypeScript interfaces
│   │   ├── hooks/               # TanStack Query hooks
│   │   ├── pages/               # Route pages
│   │   └── components/          # Reusable UI components
│   ├── package.json
│   └── vite.config.ts
├── data/                        # SQLite database (auto-created, gitignored)
├── .env.example                 # Environment variable template
├── setup.bat                    # Automated first-time setup (Windows)
├── start.bat                    # Launch both servers (Windows)
├── start.sh                     # Launch both servers (Git Bash)
├── CLAUDE.md                    # Project context for Claude Code
└── README.md                    # This file
```

## Tech Stack

| Layer    | Technology                                      |
|----------|------------------------------------------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Recharts |
| Backend  | Python, FastAPI, SQLAlchemy 2.0 (async), SQLite |
| LLM      | OpenAI, Anthropic, Ollama                       |

## Troubleshooting

- **"Module not found" on backend start**: Make sure the root `.venv` is activated. Run `.venv\Scripts\activate` from the `Evaluator/` directory.
- **Frontend can't reach backend**: Ensure the backend is running on port 8000. The Vite dev server proxies `/api` requests there.
- **Database errors**: Delete `data/evaluator.db` and restart the backend — tables are auto-created on startup.
- **Old backend/.venv directory**: Can be safely deleted. The virtual environment now lives at the project root.
