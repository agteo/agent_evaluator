import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import ErrorState from '../components/layout/ErrorState'
import { useRunPolling, useRunResults, useRunAggregation } from '../hooks/useRuns'
import { exportRunResults } from '../api/runs'
import type { RunAggregation } from '../types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function RunDetailPage() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const numericId = Number(runId)

  const { data: run, isLoading } = useRunPolling(numericId)
  const { data: aggregation } = useRunAggregation(numericId) as { data: RunAggregation | undefined }
  const [resultsOffset, setResultsOffset] = useState(0)
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null)
  const [scoreFilter, setScoreFilter] = useState('')
  const [resultSearch, setResultSearch] = useState('')
  const resultsLimit = 50
  const { data: resultsData } = useRunResults(numericId, {
    offset: resultsOffset,
    limit: resultsLimit,
  })

  const filteredResults = useMemo(() => {
    const items = resultsData?.items ?? []
    return items.filter((result) => {
      const preview = `${result.trace_summary?.input_preview || ''} ${result.trace_summary?.output_preview || ''} ${result.trace_summary?.name || ''}`.toLowerCase()
      const matchesSearch =
        !resultSearch ||
        preview.includes(resultSearch.toLowerCase()) ||
        result.trace_id.toLowerCase().includes(resultSearch.toLowerCase())
      const matchesScore =
        !scoreFilter ||
        (scoreFilter === 'errors' && !!result.error) ||
        (scoreFilter === 'low' && (result.overall_score ?? Number.POSITIVE_INFINITY) < 3) ||
        (scoreFilter === 'high' && (result.overall_score ?? Number.NEGATIVE_INFINITY) >= 4)
      return matchesSearch && matchesScore
    })
  }, [resultSearch, resultsData?.items, scoreFilter])

  const selectedResult =
    filteredResults.find((result) => result.id === selectedResultId) ??
    filteredResults[0] ??
    null

  if (isLoading) {
    return <LoadingState rows={5} />
  }

  if (!run) {
    return <ErrorState message="Run not found." onRetry={() => navigate('/runs')} />
  }

  const processed = run.completed_traces + run.failed_traces
  const pct = run.total_traces > 0 ? Math.round((processed / run.total_traces) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={run.name || `Run #${run.id}`}
        description={run.description || `${run.config_name || `Config #${run.eval_config_id}`} on ${run.dataset_name || 'all traces'}`}
      >
        <button onClick={() => navigate('/runs')} className="button-secondary px-4 py-2 text-sm font-medium">
          Back to Runs
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{run.status}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Average score</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{run.avg_score != null ? run.avg_score.toFixed(2) : '-'}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Processed</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{processed}/{run.total_traces}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Prompt version</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{run.prompt_version || '-'}</p>
        </div>
      </div>

      <div className="panel rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[run.status] || 'bg-slate-100 text-slate-800'}`}>
            {run.status}
          </span>
          <span className="text-sm text-slate-600">{run.owner || 'Unassigned owner'}</span>
          {run.commit_sha && <span className="text-sm text-slate-600">Commit {run.commit_sha}</span>}
          {run.baseline_run_name && <span className="text-sm text-slate-600">Baseline {run.baseline_run_name}</span>}
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>
              {processed} / {run.total_traces} traces ({run.completed_traces} completed
              {run.failed_traces > 0 && `, ${run.failed_traces} failed`})
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200">
            <div
              className={`h-3 rounded-full transition-all ${run.failed_traces > 0 && run.completed_traces === 0 ? 'bg-rose-500' : 'bg-teal-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="grid gap-4 text-sm md:grid-cols-4">
          <div>
            <span className="text-slate-500">Config</span>
            <div className="font-medium text-slate-950">{run.config_name || run.eval_config_id}</div>
          </div>
          <div>
            <span className="text-slate-500">Dataset</span>
            <div className="font-medium text-slate-950">{run.dataset_name || 'All traces'}</div>
          </div>
          {run.started_at && (
            <div>
              <span className="text-slate-500">Started</span>
              <div className="font-medium text-slate-950">{new Date(run.started_at).toLocaleString()}</div>
            </div>
          )}
          {run.finished_at && (
            <div>
              <span className="text-slate-500">Finished</span>
              <div className="font-medium text-slate-950">{new Date(run.finished_at).toLocaleString()}</div>
            </div>
          )}
        </div>
        {run.error_message && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {run.error_message}
          </div>
        )}
      </div>

      {resultsData && resultsData.total > 0 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <div className="panel rounded-3xl overflow-hidden">
            <div className="border-b border-slate-200/80 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h3 className="text-sm font-medium text-slate-700">Results ({resultsData.total} total)</h3>
                <div className="flex flex-wrap gap-3">
                  <input
                    value={resultSearch}
                    onChange={(e) => setResultSearch(e.target.value)}
                    placeholder="Search preview or trace"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                  <select
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(e.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    <option value="">All results</option>
                    <option value="low">Low score</option>
                    <option value="high">High score</option>
                    <option value="errors">Errors</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-200/80">
              {filteredResults.map((result) => {
                const summary = result.trace_summary
                const preview = summary?.output_preview || summary?.input_preview || result.trace_id
                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => setSelectedResultId(result.id)}
                    className={`block w-full px-5 py-4 text-left transition hover:bg-slate-50 ${selectedResult?.id === result.id ? 'bg-teal-50/70' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-950">{summary?.name || result.trace_id}</p>
                        <p className="mt-1 truncate text-sm text-slate-500">{preview}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {result.overall_score != null ? result.overall_score.toFixed(2) : '-'}
                        </p>
                        <p className={`mt-1 text-xs font-medium ${result.error ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {result.error ? 'Error' : 'OK'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            {resultsData.total > resultsLimit && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <span className="text-slate-500">
                  Showing {resultsOffset + 1}-{Math.min(resultsOffset + resultsLimit, resultsData.total)} of{' '}
                  {resultsData.total}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={resultsOffset === 0}
                    onClick={() => setResultsOffset(Math.max(0, resultsOffset - resultsLimit))}
                    className="button-secondary px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={resultsOffset + resultsLimit >= resultsData.total}
                    onClick={() => setResultsOffset(resultsOffset + resultsLimit)}
                    className="button-secondary px-3 py-1 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="panel rounded-3xl p-6">
            {selectedResult ? (
              <div className="space-y-5">
                <div>
                  <p className="text-sm text-slate-500">Selected example</p>
                  <h3 className="mt-1 text-xl font-semibold text-slate-950">{selectedResult.trace_summary?.name || selectedResult.trace_id}</h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Score {selectedResult.overall_score != null ? selectedResult.overall_score.toFixed(2) : '-'} | Tokens {selectedResult.tokens_used ?? '-'} | Latency {selectedResult.latency_ms != null ? `${(selectedResult.latency_ms / 1000).toFixed(1)}s` : '-'}
                  </p>
                </div>
                <Link to={`/traces/${selectedResult.trace_id}`} className="text-sm font-medium text-teal-700 hover:text-teal-800">
                  Open full trace
                </Link>
                {selectedResult.trace_summary && (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Trace preview</p>
                    {selectedResult.trace_summary.input_preview && (
                      <p className="mt-3 text-sm text-slate-700"><span className="font-medium">Input:</span> {selectedResult.trace_summary.input_preview}</p>
                    )}
                    {selectedResult.trace_summary.output_preview && (
                      <p className="mt-2 text-sm text-slate-700"><span className="font-medium">Output:</span> {selectedResult.trace_summary.output_preview}</p>
                    )}
                  </div>
                )}
                {selectedResult.criteria_scores && (
                  <div>
                    <p className="text-sm font-medium text-slate-900">Criteria</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {Object.entries(selectedResult.criteria_scores).map(([name, value]) => (
                        <div key={name} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">{name}</p>
                          <p className="mt-2 text-lg font-semibold text-slate-950">
                            {typeof value === 'object' && value !== null && 'score' in value
                              ? String((value as { score: number }).score)
                              : String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedResult.reasoning && (
                  <div>
                    <p className="text-sm font-medium text-slate-900">Reasoning</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedResult.reasoning}</p>
                  </div>
                )}
                {selectedResult.raw_response && (
                  <div>
                    <p className="text-sm font-medium text-slate-900">Raw model response</p>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-slate-50 p-4 text-xs whitespace-pre-wrap text-slate-700">
                      {selectedResult.raw_response}
                    </pre>
                  </div>
                )}
                {selectedResult.error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {selectedResult.error}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No result selected.</p>
            )}
          </div>
        </div>
      )}

      {aggregation && run.status === 'completed' && (
        <div className="space-y-6">
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const blob = await exportRunResults(numericId, 'json')
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `run_${numericId}_results.json`
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="button-secondary px-4 py-2 text-sm font-medium"
            >
              Export JSON
            </button>
            <button
              onClick={async () => {
                const blob = await exportRunResults(numericId, 'csv')
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `run_${numericId}_results.csv`
                link.click()
                URL.revokeObjectURL(url)
              }}
              className="button-secondary px-4 py-2 text-sm font-medium"
            >
              Export CSV
            </button>
          </div>

          {aggregation.score_distribution.some((bucket) => bucket.count > 0) && (
            <div className="panel rounded-3xl p-6">
              <h3 className="mb-4 text-sm font-medium text-slate-700">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={aggregation.score_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {Object.keys(aggregation.criteria_averages).length > 0 && (
            <div className="panel rounded-3xl p-6">
              <h3 className="mb-4 text-sm font-medium text-slate-700">Criteria Averages</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={Object.entries(aggregation.criteria_averages).map(([name, avg]) => ({
                    name,
                    average: Number(avg.toFixed(2)),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="panel rounded-3xl p-6">
            <h3 className="mb-3 text-sm font-medium text-slate-700">Statistics</h3>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
              <div className="text-center">
                <div className="text-slate-500">Mean</div>
                <div className="text-lg font-semibold">{aggregation.avg_score.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-500">Min</div>
                <div className="text-lg font-semibold">{aggregation.score_min.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-500">Max</div>
                <div className="text-lg font-semibold">{aggregation.score_max.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-500">Std Dev</div>
                <div className="text-lg font-semibold">{aggregation.score_stddev.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-500">Evaluated</div>
                <div className="text-lg font-semibold">{aggregation.total}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {run.config_snapshot && (
        <details className="panel rounded-3xl">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50/60">
            Config Snapshot
          </summary>
          <div className="px-4 pb-4">
            <pre className="max-h-64 min-w-0 overflow-y-auto rounded-2xl bg-slate-50 p-3 text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(run.config_snapshot, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
