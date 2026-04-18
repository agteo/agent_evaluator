# Phase 3 Roadmap

## Goal

Phase 3 now has two parallel goals:

- make the app faster and lighter
- turn comparison into a dedicated analysis experience
- harden the new source-ingestion workflow so self-hosted users can connect trace data with minimal setup
- close the remaining product gaps between this project and a Braintrust-style eval workspace

Also:

- add more judge model options such as OpenRouter-backed models

## Current Status

### Shipped recently

- backend OpenTelemetry tracing skeleton for eval runs and model calls
- connection domain models and sync-run tracking
- Langfuse API connector
- manual sync flow
- optional scheduled sync worker
- connection admin UI for create, edit, test, sync, delete
- trace source metadata surfaced in the UI

### Not yet complete

- performance work is still open
- comparison still lives inside `RunsPage`
- scheduled sync exists, but needs stronger UX and test coverage
- ingestion is Langfuse-only today
- connection secrets are stored in config JSON and are not yet encrypted at rest
- no backend/frontend automated coverage for connections, sync behavior, or connectors

## Priority 1: Performance And App Structure

### 1. Route-level code splitting

Status:
- Not started

Problem:
- The frontend bundle is still large, now around `826 kB` minified JS in production builds.
- Heavy pages are loaded up front even when the user only needs traces, datasets, or connections.

Work:
- lazy-load route pages with `React.lazy`
- split heavy pages first:
  - `RunDetailPage`
  - `RunsPage`
  - `EvalConfigPage`
  - `ConnectionsPage` if it keeps growing
- add route-level loading fallbacks

Success criteria:
- initial bundle size drops materially
- first load is noticeably faster on the Traces page

### 2. Lazy-load heavy libraries

Status:
- Not started

Problem:
- `recharts`, `prismjs`, and `react-simple-code-editor` are expensive and not needed everywhere

Work:
- lazy-load chart sections on runs pages
- lazy-load prompt editor on eval config page
- only load Prism language/theme assets when the editor is shown

Success criteria:
- non-editor, non-chart routes stop paying the editor/chart cost

### 3. Reduce repeated fetches and payload size

Status:
- Partially open

Problem:
- some pages still load broad data when they only need summaries
- comparison data will keep growing as runs get larger
- connections and traces now add another data surface that should stay light

Work:
- add pagination/limits to compare trace rows if needed
- consider separate API endpoints for:
  - comparison summary
  - comparison per-trace diffs
- audit React Query keys and invalidations for overfetching
- add source-filtered trace queries instead of broad trace refetches where possible

Success criteria:
- compare remains responsive with larger runs
- fewer unnecessary refetches during navigation
- connections/sync actions do not cause broad unnecessary UI churn

## Priority 2: Dedicated Comparison Experience

### 4. Move comparison into its own route

Status:
- Not started

Problem:
- `RunsPage` still contains both run management and heavier comparison analysis
- the page will get crowded as more comparison tools are added

Work:
- add a dedicated route such as `/runs/compare`
- keep run selection on the experiments list
- navigate into comparison with selected run IDs in query params or local state

Success criteria:
- experiments list stays lightweight
- comparison can grow without turning the runs page into a monolith

### 5. Side-by-side trace diff inspector

Status:
- Not started

Problem:
- the current per-trace diff table shows numeric movement, but not full side-by-side reasoning

Work:
- add a comparison inspector panel that shows, for a selected trace:
  - baseline score
  - candidate score(s)
  - criteria deltas
  - reasoning per run
  - links to the source trace
- support selecting a trace from the diff table to open the inspector

Success criteria:
- users can answer "why did this run improve or regress?" without leaving comparison

### 6. Baseline management UX

Status:
- Not started

Problem:
- baseline is currently implicit from selected order

Work:
- add explicit baseline selector in compare mode
- surface "set as baseline" actions on runs
- persist baseline choice in the compare view state

Success criteria:
- baseline choice is obvious and controllable

### 7. Comparison filters and sorting

Status:
- Not started

Problem:
- per-trace diff is still basic

Work:
- filter compared traces by:
  - biggest regression
  - biggest improvement
  - missing score
  - errors only
- sort by:
  - delta magnitude
  - baseline score
  - candidate score
- add criterion-specific diff filtering

Success criteria:
- users can quickly isolate regressions instead of manually scanning the table

## Priority 3: Ingestion And Connections Hardening

### 8. Connection security and credential handling

Status:
- Partially started

Problem:
- connection management exists, but secrets are not yet encrypted at rest
- editing a connection currently requires re-entering the secret key

Work:
- encrypt connection secrets at rest
- separate sanitized config from stored secret material cleanly
- support secret rotation without exposing old secret values in the UI
- reduce sensitive error leakage in sync/test responses

Success criteria:
- self-hosted users can store source credentials more safely
- the UI can update non-secret connection settings without awkward credential handling

### 9. Scheduled sync UX and reliability

Status:
- Partially started

Problem:
- the worker exists, but there is limited UX around due times, worker health, and retries

Work:
- show next scheduled run time in the UI
- show whether scheduled sync requires a worker process
- add backoff/retry guidance for failed runs
- consider a small worker heartbeat/status indicator
- guard against duplicate scheduled runs if multiple workers are started

Success criteria:
- scheduled sync is understandable and reliable for self-hosted users
- connection failures are diagnosable without reading server logs first

### 10. Source-aware trace workflow

Status:
- Partially started

Problem:
- traces now show source metadata, but source-driven investigation is still shallow

Work:
- filter traces by:
  - source type
  - source connection
- add source badges to more places where traces appear
- link traces back to their originating connection
- expose connection-level import volume and latest ingested traces

Success criteria:
- users can investigate imported data by source, not just by trace ID or tags

### 11. Expand connector coverage

Status:
- Not started

Problem:
- ingestion is Langfuse-only today

Work:
- add a generic JSON/JSONL connector shape
- add blob-export style ingestion as a likely next integration
- keep OTLP/webhook ingest as advanced mode, but do not block core OSS setup on it

Success criteria:
- the product is not locked to Langfuse as the only viable source

## Priority 4: Product Gaps Still Open

### 12. Better trace-to-run linking

Status:
- Not started

Problem:
- traces can be inspected, but there is still limited visibility into which runs touched them across time

Work:
- show related runs on trace detail
- show run history for a trace
- add "open this trace in compare view" affordance

Success criteria:
- traces become first-class anchors for investigation

### 13. Dataset workflow improvements

Status:
- Not started

Problem:
- datasets are more usable now, but still mostly list-management tools

Work:
- support dataset editing in place
- add dataset notes and tags
- allow filtering traces inside dataset detail
- show run history for a dataset

Success criteria:
- datasets feel like curated evaluation sets, not just containers

### 14. Experiment metadata discipline

Status:
- Not started

Problem:
- runs now support richer metadata, but there is no strong UX for consistency

Work:
- add validation or conventions for:
  - prompt version
  - commit SHA
  - owner
  - tags
- add saved presets/default metadata where useful

Success criteria:
- experiment naming and versioning become consistent enough for longitudinal analysis

### 15. Richer eval result analysis

Status:
- Not started

Problem:
- result analysis is still mostly score-centric

Work:
- add criterion-level distributions on run detail
- add error breakdown summaries
- add token/cost/latency trend summaries by run

Success criteria:
- users can diagnose quality and efficiency together

## Priority 5: Quality And Maintainability

### 16. Component extraction

Status:
- Not started

Problem:
- `RunsPage`, `RunDetailPage`, and now `ConnectionsPage` are feature-rich and should not keep growing inline

Work:
- extract:
  - comparison summary card
  - comparison charts
  - trace diff table
  - run launcher form
  - run inspector sections
  - connection form
  - connection sync history panel

Success criteria:
- page files get smaller
- future changes stop becoming high-risk edits

### 17. Add targeted tests

Status:
- Not started

Problem:
- comparison, ingestion, and scheduled sync workflows are not well protected

Work:
- add frontend tests for:
  - comparison rendering
  - baseline delta calculations
  - launcher payload construction
  - connection form behavior
  - sync history rendering
- add backend tests for:
  - compare payload shape
  - new run metadata fields
  - sqlite migration/backfill behavior
  - connection CRUD
  - due-connection scheduling logic
  - Langfuse connector response normalization

Success criteria:
- regressions in compare, connection management, and sync behavior are caught automatically

## Suggested Execution Order

1. Route-level code splitting
2. Lazy-load heavy libraries
3. Move comparison to its own route
4. Add side-by-side trace diff inspector
5. Add comparison filters/sorting/baseline selector
6. Harden connection security and scheduled sync UX
7. Add source-aware trace filters and linking
8. Extract major runs/connections components
9. Add targeted tests across compare and ingestion
10. Expand connector coverage and richer analysis views

## Definition Of Done For Phase 3

Phase 3 is complete when:

- initial load is materially smaller and faster
- comparison has a dedicated analysis route
- users can inspect regressions at the per-trace level side by side
- comparison filtering is strong enough to isolate regressions quickly
- connections are safe and reliable enough for self-hosted use
- scheduled sync is understandable and operational without extra infrastructure
- traces can be investigated by source and linked back to their runs
- the runs and connections workflows are componentized and covered by targeted tests
