# Phase 3 Milestone Checklist

## Goal

Phase 3 has two parallel product tracks:

- make the app faster and lighter
- turn comparison into a dedicated analysis experience
- harden source ingestion so self-hosted users can connect trace data with minimal setup
- close the remaining product gaps between this project and a Braintrust-style eval workspace

Also:

- add more judge model options such as OpenRouter-backed models

## Current Status

### Already shipped

- backend OpenTelemetry tracing skeleton for eval runs and model calls
- connection domain models and sync-run tracking
- Langfuse API connector
- manual sync flow
- optional scheduled sync worker
- connection admin UI for create, edit, test, sync, delete
- trace source metadata surfaced in the UI

### Still open

- performance work is still open
- comparison still lives inside `RunsPage`
- scheduled sync needs stronger UX, safety, and test coverage
- ingestion is Langfuse-only today
- connection secrets are not yet encrypted at rest
- no targeted automated coverage for connections, sync behavior, or connectors

---

## Milestone 1: Performance Baseline

Status:
- Not started

Objective:
- materially reduce the initial frontend cost before adding more comparison UI

Checklist:
- [ ] lazy-load route pages with `React.lazy`
- [ ] split heavy pages first:
  - [ ] `RunDetailPage`
  - [ ] `RunsPage`
  - [ ] `EvalConfigPage`
  - [ ] `ConnectionsPage` if it continues to grow
- [ ] add route-level loading fallbacks
- [ ] lazy-load heavy libraries:
  - [ ] `recharts`
  - [ ] `prismjs`
  - [ ] `react-simple-code-editor`
- [ ] only load Prism assets when the editor is visible
- [ ] measure the production bundle again after changes

Dependencies:
- none

Exit criteria:
- initial bundle size drops materially from the current `~826 kB` minified JS baseline
- first load feels noticeably faster on the Traces page
- non-chart and non-editor routes no longer pay the editor/chart cost

---

## Milestone 2: Comparison Extraction

Status:
- Not started

Objective:
- move comparison into its own route so experiment management stops competing with heavy analysis UI

Checklist:
- [ ] add a dedicated compare route such as `/runs/compare`
- [ ] keep run selection in the experiments list
- [ ] pass selected run IDs through query params or local route state
- [ ] keep `RunsPage` focused on:
  - [ ] launching runs
  - [ ] browsing runs
  - [ ] jumping into compare mode
- [ ] verify the compare route can scale without turning into a monolith immediately

Dependencies:
- Milestone 1 preferred, but not strictly required

Exit criteria:
- `RunsPage` becomes lighter
- comparison UI has a dedicated route and state model

---

## Milestone 3: Comparison Inspector And Filtering

Status:
- Not started

Objective:
- make regression analysis usable without leaving comparison mode

Checklist:
- [ ] add a side-by-side trace diff inspector
- [ ] show for selected trace:
  - [ ] baseline score
  - [ ] candidate score(s)
  - [ ] criteria deltas
  - [ ] reasoning per run
  - [ ] links back to the source trace
- [ ] support selecting a trace from the diff table to open the inspector
- [ ] add explicit baseline selector
- [ ] add "set as baseline" affordance
- [ ] persist baseline selection in compare state
- [ ] add filters:
  - [ ] biggest regression
  - [ ] biggest improvement
  - [ ] missing score
  - [ ] errors only
- [ ] add sorting:
  - [ ] delta magnitude
  - [ ] baseline score
  - [ ] candidate score
- [ ] add criterion-specific diff filtering

Dependencies:
- Milestone 2

Exit criteria:
- users can answer "why did this run improve or regress?" inside compare mode
- regressions can be isolated quickly without manual scanning

---

## Milestone 4: Connection Security And Scheduled Sync Hardening

Status:
- Partially started

Objective:
- make the new ingestion path safe and operational for self-hosted users

Checklist:
- [ ] encrypt connection secrets at rest
- [ ] separate sanitized config from stored secret material
- [ ] support editing non-secret settings without forcing awkward secret handling
- [ ] support explicit secret rotation
- [ ] reduce sensitive error leakage from sync/test responses
- [ ] show next scheduled run time in the UI
- [ ] show clear worker requirement/status messaging in the UI
- [ ] add retry/backoff guidance for failed scheduled syncs
- [ ] add protection against duplicate scheduled runs if multiple workers start
- [ ] decide whether to add a worker heartbeat/status indicator

Dependencies:
- current connection and worker implementation

Exit criteria:
- self-hosted users can store source credentials more safely
- scheduled sync is understandable and operational without extra infrastructure
- failures are diagnosable without diving into server logs first

---

## Milestone 5: Source-Aware Trace Workflow

Status:
- Partially started

Objective:
- make imported data explorable by source, not just by trace ID or tags

Checklist:
- [ ] add trace filters by:
  - [ ] `source_type`
  - [ ] `source_connection_id`
- [ ] add source badges in more places where traces are shown
- [ ] link traces back to their originating connection
- [ ] expose per-connection import volume
- [ ] expose latest ingested traces per connection
- [ ] decide whether connection detail deserves its own route or can stay inside `ConnectionsPage`

Dependencies:
- current trace source metadata

Exit criteria:
- users can investigate imported traces by source cleanly
- source provenance is visible across traces, not only on detail pages

---

## Milestone 6: Connector Expansion

Status:
- Not started

Objective:
- avoid making Langfuse the only practical source

Checklist:
- [ ] define generic connector expectations clearly
- [ ] add generic JSON/JSONL connector shape
- [ ] add blob-export style ingestion as the next likely source
- [ ] document OTLP/webhook ingest as advanced mode only
- [ ] keep core OSS setup independent from collector/webhook infrastructure

Dependencies:
- Milestone 4 preferred

Exit criteria:
- ingestion architecture is no longer Langfuse-only
- OSS users still have a simple manual/scheduled setup path

---

## Milestone 7: Product Gaps In Analysis Workflow

Status:
- Not started

Objective:
- deepen the workspace beyond basic score inspection

Checklist:
- [ ] better trace-to-run linking
  - [ ] show related runs on trace detail
  - [ ] show run history for a trace
  - [ ] add "open this trace in compare view"
- [ ] dataset workflow improvements
  - [ ] edit dataset in place
  - [ ] dataset notes and tags
  - [ ] filter traces inside dataset detail
  - [ ] dataset run history
- [ ] experiment metadata discipline
  - [ ] validate prompt version
  - [ ] validate commit SHA
  - [ ] validate owner
  - [ ] validate tags
  - [ ] add metadata presets/defaults where useful
- [ ] richer eval result analysis
  - [ ] criterion-level distributions
  - [ ] error breakdown summaries
  - [ ] token/cost/latency summaries by run

Dependencies:
- comparison improvements are helpful first

Exit criteria:
- traces, datasets, and runs feel connected as one investigation workflow
- quality and efficiency can be analyzed together

---

## Milestone 8: Component Extraction

Status:
- Not started

Objective:
- reduce page-level complexity before the UI becomes fragile

Checklist:
- [ ] extract comparison summary card
- [ ] extract comparison charts
- [ ] extract trace diff table
- [ ] extract run launcher form
- [ ] extract run inspector sections
- [ ] extract connection form
- [ ] extract connection sync history panel

Dependencies:
- comparison and connection UX should stabilize first

Exit criteria:
- `RunsPage`, `RunDetailPage`, and `ConnectionsPage` shrink materially
- future edits stop being high-risk page-file changes

---

## Milestone 9: Targeted Tests

Status:
- Not started

Objective:
- put guardrails around the highest-risk new workflows

Checklist:
- [ ] frontend tests:
  - [ ] comparison rendering
  - [ ] baseline delta calculations
  - [ ] launcher payload construction
  - [ ] connection form behavior
  - [ ] sync history rendering
- [ ] backend tests:
  - [ ] compare payload shape
  - [ ] new run metadata fields
  - [ ] sqlite migration/backfill behavior
  - [ ] connection CRUD
  - [ ] due-connection scheduling logic
  - [ ] Langfuse connector response normalization

Dependencies:
- core UI/API shapes should settle first

Exit criteria:
- regressions in compare, connection management, and sync behavior are caught automatically

---

## Milestone 10: Optional Model And Platform Expansion

Status:
- Not started

Objective:
- extend evaluator flexibility after the core workflow is stable

Checklist:
- [ ] add OpenRouter or other additional judge model support
- [ ] review whether model/provider selection UX needs restructuring
- [ ] document tradeoffs across providers for judge usage

Dependencies:
- not required for the rest of Phase 3

Exit criteria:
- users have more than the current model/provider path for LLM-as-judge

---

## Recommended Execution Order

1. Milestone 1: Performance Baseline
2. Milestone 2: Comparison Extraction
3. Milestone 3: Comparison Inspector And Filtering
4. Milestone 4: Connection Security And Scheduled Sync Hardening
5. Milestone 5: Source-Aware Trace Workflow
6. Milestone 8: Component Extraction
7. Milestone 9: Targeted Tests
8. Milestone 6: Connector Expansion
9. Milestone 7: Product Gaps In Analysis Workflow
10. Milestone 10: Optional Model And Platform Expansion

## Recommended Next Milestone

If the goal is highest user-value per unit of work, do this next:

- Milestone 4: Connection Security And Scheduled Sync Hardening

Reason:
- the connection flow is now real product surface, not scaffolding
- it affects self-hosted trust and operability directly
- it reduces risk before you add more ingest sources

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
