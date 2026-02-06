export interface TraceSummary {
  id: string
  name: string | null
  tags: string[] | null
  total_cost: number | null
  latency_ms: number | null
  timestamp: string | null
  imported_at: string
  /** Truncated input/output for list preview (from list API only) */
  input_preview?: string
  output_preview?: string
}

export interface Trace extends TraceSummary {
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  metadata_: Record<string, unknown> | null
  observations: unknown[] | null
  scores: Record<string, unknown> | null
  session_id: string | null
  user_id: string | null
  version: string | null
  release: string | null
  raw_json: string | null
}

export interface Criterion {
  name: string
  description: string
  weight: number
}

export interface EvalConfig {
  id: number
  name: string
  description: string | null
  provider: string
  model: string
  temperature: number
  prompt_template: string
  criteria: Criterion[]
  scoring_type: string
  scale_min: number
  scale_max: number
  created_at: string
  updated_at: string
}

export interface EvalConfigCreate {
  name: string
  description?: string
  provider: string
  model: string
  temperature: number
  prompt_template: string
  criteria: Criterion[]
  scoring_type: string
  scale_min: number
  scale_max: number
}

export interface EvalRun {
  id: number
  eval_config_id: number
  dataset_id: number | null
  status: string
  total_traces: number
  completed_traces: number
  failed_traces: number
  avg_score: number | null
  error_message: string | null
  config_snapshot: Record<string, unknown> | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export interface TraceSummaryForResult {
  name: string | null
  timestamp: string | null
  imported_at: string
  input_preview: string
  output_preview: string
}

export interface EvalResult {
  id: number
  run_id: number
  trace_id: string
  overall_score: number | null
  criteria_scores: Record<string, number> | null
  reasoning: string | null
  raw_response: string | null
  prompt_used: string | null
  tokens_used: number | null
  latency_ms: number | null
  error: string | null
  created_at: string
  trace_summary?: TraceSummaryForResult | null
}

export interface Dataset {
  id: number
  name: string
  description: string | null
  version: number
  trace_count: number
  created_at: string
  updated_at: string
}

export interface TraceImportResponse {
  imported: number
  skipped: number
  errors: string[]
}

export interface RunAggregation {
  run_id: number
  total: number
  completed: number
  failed: number
  avg_score: number
  score_distribution: { bucket: string; count: number }[]
  criteria_averages: Record<string, number>
  score_min: number
  score_max: number
  score_stddev: number
}

export interface RunComparison {
  runs: {
    run_id: number
    config_name: string
    avg_score: number | null
    criteria_averages: Record<string, number>
  }[]
  trace_comparisons: { trace_id: string; scores: Record<number, number | null> }[]
}
