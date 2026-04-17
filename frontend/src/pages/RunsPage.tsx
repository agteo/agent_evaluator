import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import EmptyState from '../components/layout/EmptyState'
import ErrorState from '../components/layout/ErrorState'
import { useRuns, useCreateRun, useDeleteRun, useCompareRuns } from '../hooks/useRuns'
import { useEvalConfigs } from '../hooks/useEvals'
import { useDatasets } from '../hooks/useDatasets'
import type { EvalRun } from '../types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function RunsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [showLauncher, setShowLauncher] = useState(false)
  const [selectedConfigId, setSelectedConfigId] = useState<number | ''>('')
  const [traceSource, setTraceSource] = useState<'dataset' | 'all'>('all')
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('')
  const [runName, setRunName] = useState('')
  const [runOwner, setRunOwner] = useState('')
  const [runPromptVersion, setRunPromptVersion] = useState('')
  const [runCommitSha, setRunCommitSha] = useState('')
  const [runDescription, setRunDescription] = useState('')
  const [runTags, setRunTags] = useState('')
  const [selectedRunIds, setSelectedRunIds] = useState<number[]>([])
  const [comparisonSearch, setComparisonSearch] = useState('')

  const { data, isLoading, isError, refetch } = useRuns({
    search: search || undefined,
    status: statusFilter || undefined,
    source_label: sourceFilter || undefined,
  })
  const createMutation = useCreateRun()
  const deleteMutation = useDeleteRun()
  const compareMutation = useCompareRuns()
  const { data: configs } = useEvalConfigs()
  const { data: datasets } = useDatasets()

  const selectedRuns = useMemo(
    () => data?.items.filter((run) => selectedRunIds.includes(run.id)) ?? [],
    [data?.items, selectedRunIds],
  )

  const summaryMetrics = useMemo(() => {
    const items = data?.items ?? []
    const completed = items.filter((run) => run.status === 'completed')
    return {
      total: items.length,
      active: items.filter((run) => run.status === 'pending' || run.status === 'running').length,
      completed: completed.length,
      avg:
        completed.length > 0
          ? completed.reduce((sum, run) => sum + (run.avg_score ?? 0), 0) / completed.length
          : null,
    }
  }, [data?.items])

  const handleLaunch = async () => {
    if (!selectedConfigId) return
    const run = await createMutation.mutateAsync({
      eval_config_id: Number(selectedConfigId),
      dataset_id:
        traceSource === 'dataset' && selectedDatasetId ? Number(selectedDatasetId) : undefined,
      name: runName || undefined,
      description: runDescription || undefined,
      owner: runOwner || undefined,
      tags: runTags.split(',').map((tag) => tag.trim()).filter(Boolean),
      source_label: traceSource === 'dataset' ? 'dataset' : 'all-traces',
      prompt_version: runPromptVersion || undefined,
      commit_sha: runCommitSha || undefined,
      baseline_run_id: selectedRunIds[0] || undefined,
    })
    setShowLauncher(false)
    navigate(`/runs/${run.id}`)
  }

  const handleDelete = (event: React.MouseEvent, id: number) => {
    event.stopPropagation()
    if (confirm('Delete this run and all its results?')) {
      deleteMutation.mutate(id)
    }
  }

  const toggleRunSelection = (runId: number) => {
    setSelectedRunIds((current) =>
      current.includes(runId)
        ? current.filter((id) => id !== runId)
        : [...current, runId].slice(-4),
    )
  }

  const scoreDelta = (run: EvalRun) => {
    if (selectedRuns.length === 0) return null
    const baseline = selectedRuns[0]
    if (baseline.id === run.id || baseline.avg_score == null || run.avg_score == null) return null
    return run.avg_score - baseline.avg_score
  }

  const comparison = compareMutation.data
  const baselineComparisonRun = comparison?.runs[0]

  const comparisonScoreRows = useMemo(() => {
    if (!comparison || comparison.runs.length === 0) return []
    const baseline = comparison.runs[0]
    return comparison.runs.map((run) => ({
      runId: run.run_id,
      name: run.name || run.config_name,
      avgScore: run.avg_score,
      delta:
        run.run_id !== baseline.run_id && run.avg_score != null && baseline.avg_score != null
          ? run.avg_score - baseline.avg_score
          : null,
    }))
  }, [comparison])

  const comparisonCriteriaRows = useMemo(() => {
    if (!comparison || comparison.runs.length === 0) return []
    const baselineCriteria = comparison.runs[0].criteria_averages
    const names = Array.from(
      new Set(comparison.runs.flatMap((run) => Object.keys(run.criteria_averages))),
    )
    return names.map((name) => ({
      name,
      baseline: baselineCriteria[name] ?? null,
      values: comparison.runs.slice(1).map((run) => {
        const value = run.criteria_averages[name] ?? null
        return {
          runId: run.run_id,
          runName: run.name || run.config_name,
          value,
          delta:
            value != null && baselineCriteria[name] != null
              ? value - baselineCriteria[name]
              : null,
        }
      }),
    }))
  }, [comparison])

  const comparisonTraceRows = useMemo(() => {
    if (!comparison || comparison.runs.length === 0) return []
    const baseline = comparison.runs[0]
    return comparison.trace_comparisons
      .map((trace) => {
        const baselineScore = trace.scores[baseline.run_id] ?? null
        const deltas = comparison.runs.slice(1).map((run) => {
          const score = trace.scores[run.run_id] ?? null
          return {
            runId: run.run_id,
            runName: run.name || run.config_name,
            score,
            delta:
              score != null && baselineScore != null ? score - baselineScore : null,
          }
        })
        const maxAbsDelta = deltas.reduce((max, item) => {
          const value = item.delta == null ? 0 : Math.abs(item.delta)
          return Math.max(max, value)
        }, 0)
        return {
          ...trace,
          baselineScore,
          deltas,
          maxAbsDelta,
        }
      })
      .filter((trace) => {
        if (!comparisonSearch) return true
        const haystack = `${trace.trace_name || ''} ${trace.trace_id} ${trace.input_preview} ${trace.output_preview}`.toLowerCase()
        return haystack.includes(comparisonSearch.toLowerCase())
      })
      .sort((a, b) => b.maxAbsDelta - a.maxAbsDelta)
  }, [comparison, comparisonSearch])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Experiments"
        description="Launch runs with version metadata, compare baselines, and drill into evaluation outcomes from one workspace."
      >
        <button
          onClick={() => setShowLauncher(!showLauncher)}
          className="button-primary px-4 py-2 text-sm font-medium"
        >
          {showLauncher ? 'Hide Launcher' : 'New Run'}
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Total runs</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summaryMetrics.total}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Active now</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summaryMetrics.active}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{summaryMetrics.completed}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Mean score</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {summaryMetrics.avg != null ? summaryMetrics.avg.toFixed(2) : '-'}
          </p>
        </div>
      </div>

      <div className="panel rounded-3xl p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_180px_180px_auto]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by run name, owner, description, or commit"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="running">Running</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
          >
            <option value="">All sources</option>
            <option value="all-traces">All traces</option>
            <option value="dataset">Dataset</option>
          </select>
          <button
            onClick={() => compareMutation.mutate(selectedRunIds)}
            disabled={selectedRunIds.length < 2 || compareMutation.isPending}
            className="button-secondary px-4 py-3 text-sm font-medium disabled:opacity-50"
          >
            {compareMutation.isPending
              ? 'Comparing...'
              : `Compare ${selectedRunIds.length || ''}`.trim()}
          </button>
        </div>
        {selectedRuns.length > 0 && (
          <p className="mt-3 text-sm text-slate-600">
            Baseline is{' '}
            <span className="font-medium text-slate-900">
              {selectedRuns[0].name || `Run #${selectedRuns[0].id}`}
            </span>
            . Select up to 4 runs to compare.
          </p>
        )}
      </div>

      {showLauncher && (
        <div className="panel rounded-3xl border border-teal-200 p-6 space-y-4">
          <h3 className="text-lg font-medium text-slate-900">Launch Experiment</h3>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Eval Config *
              </label>
              <select
                value={selectedConfigId}
                onChange={(e) => setSelectedConfigId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="">Select a config...</option>
                {configs?.items.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Trace Source
              </label>
              <select
                value={traceSource}
                onChange={(e) => setTraceSource(e.target.value as 'all' | 'dataset')}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="all">All Traces</option>
                <option value="dataset">From Dataset</option>
              </select>
            </div>
            {traceSource === 'dataset' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Dataset
                </label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="">Select a dataset...</option>
                  {datasets?.items.map((dataset) => (
                    <option key={dataset.id} value={dataset.id}>
                      {dataset.name} ({dataset.trace_count} traces)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            <input
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder="Run name"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
            />
            <input
              value={runOwner}
              onChange={(e) => setRunOwner(e.target.value)}
              placeholder="Owner"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
            />
            <input
              value={runPromptVersion}
              onChange={(e) => setRunPromptVersion(e.target.value)}
              placeholder="Prompt version"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
            />
            <input
              value={runCommitSha}
              onChange={(e) => setRunCommitSha(e.target.value)}
              placeholder="Commit SHA"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>
          <textarea
            value={runDescription}
            onChange={(e) => setRunDescription(e.target.value)}
            rows={2}
            placeholder="What changed in this experiment?"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
          />
          <input
            value={runTags}
            onChange={(e) => setRunTags(e.target.value)}
            placeholder="Tags, comma-separated"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleLaunch}
              disabled={!selectedConfigId || createMutation.isPending}
              className="button-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? 'Launching...' : 'Start Run'}
            </button>
            <button
              onClick={() => setShowLauncher(false)}
              className="button-secondary px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {createMutation.isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          Failed to launch run: {(createMutation.error as Error)?.message || 'Unknown error'}
        </div>
      )}

      {comparison && (
        <div className="space-y-6">
          <div className="panel rounded-3xl p-6">
            <h3 className="text-lg font-medium text-slate-950">Comparison</h3>
            <p className="mt-1 text-sm text-slate-600">
              Baseline is {baselineComparisonRun?.name || baselineComparisonRun?.config_name}. Use this to spot score movement and which traces changed the most.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {comparison.runs.map((run) => (
                <div key={run.run_id} className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-950">
                        {run.name || run.config_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {run.owner || 'Unassigned'} | {run.prompt_version || 'No prompt version'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[run.status] || 'bg-slate-100 text-slate-700'}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Average score
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">
                        {run.avg_score != null ? run.avg_score.toFixed(2) : '-'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Criteria</p>
                      <p className="mt-2 text-sm text-slate-700">
                        {Object.keys(run.criteria_averages).length}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="panel rounded-3xl p-6">
              <h3 className="text-sm font-medium text-slate-800">Average Score Delta</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonScoreRows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgScore" fill="#0f766e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel rounded-3xl p-6">
              <h3 className="text-sm font-medium text-slate-800">Criteria Delta Vs Baseline</h3>
              <div className="mt-4 space-y-3">
                {comparisonCriteriaRows.map((criterion) => (
                  <div
                    key={criterion.name}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium text-slate-900">{criterion.name}</p>
                      <p className="text-xs text-slate-500">
                        Baseline{' '}
                        {typeof criterion.baseline === 'number'
                          ? criterion.baseline.toFixed(2)
                          : '-'}
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {criterion.values.map((value) => (
                        <div
                          key={value.runId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-600">{value.runName}</span>
                          <span
                            className={
                              typeof value.delta === 'number'
                                ? value.delta >= 0
                                  ? 'font-medium text-emerald-600'
                                  : 'font-medium text-rose-600'
                                : 'text-slate-400'
                            }
                          >
                            {typeof value.value === 'number' ? value.value.toFixed(2) : '-'}
                            {typeof value.delta === 'number'
                              ? ` (${value.delta >= 0 ? '+' : ''}${value.delta.toFixed(2)})`
                              : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel rounded-3xl overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-800">Per-Trace Diff</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Sorted by the largest absolute score movement away from baseline.
                </p>
              </div>
              <input
                value={comparisonSearch}
                onChange={(e) => setComparisonSearch(e.target.value)}
                placeholder="Search trace name, preview, or ID"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div className="divide-y divide-slate-200/80">
              {comparisonTraceRows.slice(0, 40).map((trace) => (
                <div
                  key={trace.trace_id}
                  className="grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,2fr)_160px_minmax(0,1fr)]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {trace.trace_name || trace.trace_id}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {trace.output_preview || trace.input_preview || trace.trace_id}
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Baseline score:{' '}
                      {trace.baselineScore != null ? trace.baselineScore.toFixed(2) : '-'}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-800">Largest shift</p>
                    <p
                      className={
                        trace.maxAbsDelta === 0 ? 'text-slate-400' : 'font-medium text-slate-900'
                      }
                    >
                      {trace.maxAbsDelta > 0 ? trace.maxAbsDelta.toFixed(2) : '-'}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {trace.deltas.map((deltaRow) => (
                      <div
                        key={deltaRow.runId}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="truncate pr-3 text-slate-600">
                          {deltaRow.runName}
                        </span>
                        <span
                          className={
                            deltaRow.delta == null
                              ? 'text-slate-400'
                              : deltaRow.delta >= 0
                                ? 'font-medium text-emerald-600'
                                : 'font-medium text-rose-600'
                          }
                        >
                          {deltaRow.score != null ? deltaRow.score.toFixed(2) : '-'}
                          {deltaRow.delta != null
                            ? ` (${deltaRow.delta >= 0 ? '+' : ''}${deltaRow.delta.toFixed(2)})`
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {comparisonTraceRows.length === 0 && (
              <div className="px-5 py-8 text-sm text-slate-500">
                No trace comparisons matched the current filter.
              </div>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState message="Failed to load runs." onRetry={() => refetch()} />
      ) : !data || data.total === 0 ? (
        <EmptyState
          title="No runs yet."
          description="Create an eval config first, then launch a run to evaluate your traces."
          actionLabel="New Run"
          onAction={() => setShowLauncher(true)}
        />
      ) : (
        <div className="panel rounded-3xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200/80">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Compare
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Experiment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Average
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Delta
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {data.items.map((run) => {
                const pct =
                  run.total_traces > 0
                    ? Math.round(
                        ((run.completed_traces + run.failed_traces) / run.total_traces) * 100,
                      )
                    : 0
                const delta = scoreDelta(run)
                return (
                  <tr
                    key={run.id}
                    className="cursor-pointer hover:bg-white/70"
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRunIds.includes(run.id)}
                        onChange={(event) => {
                          event.stopPropagation()
                          toggleRunSelection(run.id)
                        }}
                      />
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <p className="font-medium text-slate-950">
                        {run.name || `Run #${run.id}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {run.config_name || `Config #${run.eval_config_id}`}{' '}
                        {run.dataset_name ? `| ${run.dataset_name}` : '| All traces'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {run.owner || 'No owner'}{' '}
                        {run.commit_sha ? `| ${run.commit_sha}` : ''}{' '}
                        {run.prompt_version ? `| ${run.prompt_version}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[run.status] || 'bg-slate-100 text-slate-800'}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 max-w-24 flex-1 rounded-full bg-slate-200">
                          <div
                            className="h-2 rounded-full bg-teal-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {run.completed_traces + run.failed_traces}/{run.total_traces}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-slate-700">
                      {run.avg_score != null ? run.avg_score.toFixed(2) : '-'}
                    </td>
                    <td
                      className={`px-4 py-4 text-sm font-medium ${delta == null ? 'text-slate-400' : delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {delta == null ? '-' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={(event) => handleDelete(event, run.id)}
                        className="text-sm text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
