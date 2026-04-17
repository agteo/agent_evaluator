# Phase 3 Roadmap

## Goal

Phase 3 should tighten the product after the Phase 1-2 workflow rebuild:

- make the app faster and lighter
- turn comparison into a dedicated analysis experience
- close the remaining product gaps between this project and a Braintrust-style eval workspace

## Priority 1: Performance And App Structure

### 1. Route-level code splitting

Problem:
- The frontend bundle is still large, around `810 kB` minified JS in production builds.
- Heavy pages are loaded up front even when the user only needs traces or datasets.

Work:
- lazy-load route pages with `React.lazy`
- split heavy pages first:
  - `RunDetailPage`
  - `RunsPage`
  - `EvalConfigPage`
- add route-level loading fallbacks

Success criteria:
- initial bundle size drops materially
- first load is noticeably faster on the Traces page

### 2. Lazy-load heavy libraries

Problem:
- `recharts`, `prismjs`, and `react-simple-code-editor` are expensive and not needed everywhere

Work:
- lazy-load chart sections on runs pages
- lazy-load prompt editor on eval config page
- only load Prism language/theme assets when the editor is shown

Success criteria:
- non-editor, non-chart routes stop paying the editor/chart cost

### 3. Reduce repeated fetches and payload size

Problem:
- some pages still load broad data when they only need summaries
- comparison data will keep growing as runs get larger

Work:
- add pagination/limits to compare trace rows if needed
- consider separate API endpoints for:
  - comparison summary
  - comparison per-trace diffs
- audit React Query keys and invalidations for overfetching

Success criteria:
- compare remains responsive with larger runs
- fewer unnecessary refetches during navigation

## Priority 2: Dedicated Comparison Experience

### 4. Move comparison into its own route

Problem:
- `RunsPage` now contains both run management and heavier comparison analysis
- the page will get crowded as more comparison tools are added

Work:
- add a dedicated route such as `/runs/compare`
- keep run selection on the experiments list
- navigate into comparison with selected run IDs in query params or local state

Success criteria:
- experiments list stays lightweight
- comparison can grow without turning the runs page into a monolith

### 5. Side-by-side trace diff inspector

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
- users can answer “why did this run improve or regress?” without leaving comparison

### 6. Baseline management UX

Problem:
- baseline is currently implicit from selected order

Work:
- add explicit baseline selector in compare mode
- surface “set as baseline” actions on runs
- persist baseline choice in the compare view state

Success criteria:
- baseline choice is obvious and controllable

### 7. Comparison filters and sorting

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

## Priority 3: Product Gaps Still Open

### 8. Better trace-to-run linking

Problem:
- traces can be inspected, but there is still limited visibility into which runs touched them across time

Work:
- show related runs on trace detail
- show run history for a trace
- add “open this trace in compare view” affordance

Success criteria:
- traces become first-class anchors for investigation

### 9. Dataset workflow improvements

Problem:
- datasets are more usable now, but still mostly list-management tools

Work:
- support dataset editing in place
- add dataset notes and tags
- allow filtering traces inside dataset detail
- show run history for a dataset

Success criteria:
- datasets feel like curated evaluation sets, not just containers

### 10. Experiment metadata discipline

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

### 11. Richer eval result analysis

Problem:
- result analysis is still mostly score-centric

Work:
- add criterion-level distributions on run detail
- add error breakdown summaries
- add token/cost/latency trend summaries by run

Success criteria:
- users can diagnose quality and efficiency together

## Priority 4: Quality And Maintainability

### 12. Component extraction

Problem:
- `RunsPage` and `RunDetailPage` are now feature-rich and should not keep growing inline

Work:
- extract:
  - comparison summary card
  - comparison charts
  - trace diff table
  - run launcher form
  - run inspector sections

Success criteria:
- page files get smaller
- future changes stop becoming high-risk edits

### 13. Add targeted tests

Problem:
- the new comparison and metadata workflows are not well protected

Work:
- add frontend tests for:
  - comparison rendering
  - baseline delta calculations
  - launcher payload construction
- add backend tests for:
  - compare payload shape
  - new run metadata fields
  - sqlite migration/backfill behavior

Success criteria:
- regressions in compare and run metadata are caught automatically

## Suggested Execution Order

1. Route-level code splitting
2. Lazy-load heavy libraries
3. Move comparison to its own route
4. Add side-by-side trace diff inspector
5. Add comparison filters/sorting/baseline selector
6. Extract major runs components
7. Add tests around compare and metadata flows
8. Expand trace/dataset cross-linking and richer analysis views

## Definition Of Done For Phase 3

Phase 3 is complete when:

- initial load is materially smaller and faster
- comparison has a dedicated analysis route
- users can inspect regressions at the per-trace level side by side
- comparison filtering is strong enough to isolate regressions quickly
- the runs workflow is componentized and covered by targeted tests
