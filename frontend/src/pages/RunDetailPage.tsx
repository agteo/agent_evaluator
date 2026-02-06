import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  const { data: aggregation } = useRunAggregation(
    numericId,
  ) as { data: RunAggregation | undefined }
  const [resultsOffset, setResultsOffset] = useState(0)
  const resultsLimit = 50
  const { data: resultsData } = useRunResults(numericId, {
    offset: resultsOffset,
    limit: resultsLimit,
  })
  const [expandedResult, setExpandedResult] = useState<number | null>(null)

  if (isLoading) {
    return <LoadingState rows={5} />
  }

  if (!run) {
    return (
      <ErrorState
        message="Run not found."
        onRetry={() => navigate('/runs')}
      />
    )
  }

  const processed = run.completed_traces + run.failed_traces
  const pct = run.total_traces > 0 ? Math.round((processed / run.total_traces) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader title={`Run #${run.id}`}>
        <button
          onClick={() => navigate('/runs')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Runs
        </button>
      </PageHeader>

      {/* Status & Progress */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[run.status] || 'bg-gray-100 text-gray-800'}`}
          >
            {run.status}
          </span>
          {run.avg_score != null && (
            <span className="text-sm text-gray-600">
              Avg Score: <span className="font-semibold">{run.avg_score.toFixed(2)}</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>
              {processed} / {run.total_traces} traces ({run.completed_traces} completed
              {run.failed_traces > 0 && `, ${run.failed_traces} failed`})
            </span>
            <span>{pct}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${run.failed_traces > 0 && run.completed_traces === 0 ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Config ID:</span>{' '}
            <span className="font-medium">{run.eval_config_id}</span>
          </div>
          {run.dataset_id && (
            <div>
              <span className="text-gray-500">Dataset ID:</span>{' '}
              <span className="font-medium">{run.dataset_id}</span>
            </div>
          )}
          {run.started_at && (
            <div>
              <span className="text-gray-500">Started:</span>{' '}
              <span className="font-medium">{new Date(run.started_at).toLocaleString()}</span>
            </div>
          )}
          {run.finished_at && (
            <div>
              <span className="text-gray-500">Finished:</span>{' '}
              <span className="font-medium">{new Date(run.finished_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        {run.error_message && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {run.error_message}
          </div>
        )}
      </div>

      {/* Results table */}
      {resultsData && resultsData.total > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">
              Results ({resultsData.total} total)
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trace ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Latency
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {resultsData.items.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedResult(expandedResult === r.id ? null : r.id)
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {r.trace_id.slice(0, 16)}...
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {r.overall_score != null ? r.overall_score.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.tokens_used ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.latency_ms != null ? `${(r.latency_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {r.error ? (
                        <span className="text-xs text-red-600">Error</span>
                      ) : (
                        <span className="text-xs text-green-600">OK</span>
                      )}
                    </td>
                  </tr>
                  {expandedResult === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={5} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3 text-sm">
                          {r.reasoning && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Reasoning</p>
                              <p className="text-gray-600 whitespace-pre-wrap">{r.reasoning}</p>
                            </div>
                          )}
                          {r.criteria_scores && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Criteria Scores</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(r.criteria_scores).map(([name, val]) => (
                                  <div
                                    key={name}
                                    className="bg-white border border-gray-200 rounded px-3 py-2"
                                  >
                                    <span className="text-gray-500 text-xs">{name}</span>
                                    <div className="font-medium">
                                      {typeof val === 'object' && val !== null && 'score' in val
                                        ? (val as { score: number }).score
                                        : String(val)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {r.error && (
                            <div>
                              <p className="font-medium text-red-700 mb-1">Error</p>
                              <p className="text-red-600">{r.error}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          {resultsData.total > resultsLimit && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
              <span className="text-gray-500">
                Showing {resultsOffset + 1}–{Math.min(resultsOffset + resultsLimit, resultsData.total)} of{' '}
                {resultsData.total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={resultsOffset === 0}
                  onClick={() => setResultsOffset(Math.max(0, resultsOffset - resultsLimit))}
                  className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  disabled={resultsOffset + resultsLimit >= resultsData.total}
                  onClick={() => setResultsOffset(resultsOffset + resultsLimit)}
                  className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts & Export */}
      {aggregation && run.status === 'completed' && (
        <div className="space-y-6">
          {/* Export buttons */}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const blob = await exportRunResults(numericId, 'json')
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `run_${numericId}_results.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export JSON
            </button>
            <button
              onClick={async () => {
                const blob = await exportRunResults(numericId, 'csv')
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `run_${numericId}_results.csv`
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>

          {/* Score histogram */}
          {aggregation.score_distribution.some((d) => d.count > 0) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={aggregation.score_distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Criteria averages */}
          {Object.keys(aggregation.criteria_averages).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Criteria Averages</h3>
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
                  <Bar dataKey="average" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-gray-500">Mean</div>
                <div className="font-semibold text-lg">{aggregation.avg_score.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Min</div>
                <div className="font-semibold text-lg">{aggregation.score_min.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Max</div>
                <div className="font-semibold text-lg">{aggregation.score_max.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Std Dev</div>
                <div className="font-semibold text-lg">{aggregation.score_stddev.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-500">Evaluated</div>
                <div className="font-semibold text-lg">{aggregation.total}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Config snapshot */}
      {run.config_snapshot && (
        <details className="bg-white rounded-lg border border-gray-200">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
            Config Snapshot
          </summary>
          <div className="px-4 pb-4">
            <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-64">
              {JSON.stringify(run.config_snapshot, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
