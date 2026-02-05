import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useRuns, useCreateRun, useDeleteRun } from '../hooks/useRuns'
import { useEvalConfigs } from '../hooks/useEvals'
import { useDatasets } from '../hooks/useDatasets'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function RunsPage() {
  const { data, isLoading } = useRuns()
  const createMutation = useCreateRun()
  const deleteMutation = useDeleteRun()
  const navigate = useNavigate()

  const [showLauncher, setShowLauncher] = useState(false)
  const [selectedConfigId, setSelectedConfigId] = useState<number | ''>('')
  const [traceSource, setTraceSource] = useState<'dataset' | 'all'>('all')
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | ''>('')

  const { data: configs } = useEvalConfigs()
  const { data: datasets } = useDatasets()

  const handleLaunch = async () => {
    if (!selectedConfigId) return
    const body: { eval_config_id: number; dataset_id?: number } = {
      eval_config_id: Number(selectedConfigId),
    }
    if (traceSource === 'dataset' && selectedDatasetId) {
      body.dataset_id = Number(selectedDatasetId)
    }
    const run = await createMutation.mutateAsync(body)
    setShowLauncher(false)
    navigate(`/runs/${run.id}`)
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this run and all its results?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evaluation Runs"
        description="Launch, monitor, and compare evaluation runs"
      >
        <button
          onClick={() => setShowLauncher(!showLauncher)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Run
        </button>
      </PageHeader>

      {/* Run launcher */}
      {showLauncher && (
        <div className="bg-white rounded-lg border border-blue-200 p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Launch Evaluation Run</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eval Config *</label>
              <select
                value={selectedConfigId}
                onChange={(e) => setSelectedConfigId(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select a config...</option>
                {configs?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trace Source</label>
              <select
                value={traceSource}
                onChange={(e) => setTraceSource(e.target.value as 'all' | 'dataset')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Traces</option>
                <option value="dataset">From Dataset</option>
              </select>
            </div>
            {traceSource === 'dataset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Select a dataset...</option>
                  {datasets?.items.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.trace_count} traces)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleLaunch}
              disabled={!selectedConfigId || createMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Launching...' : 'Start Run'}
            </button>
            <button
              onClick={() => setShowLauncher(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading runs...</div>
      ) : !data || data.total === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
          No runs yet. Create an eval config and launch a run to get started.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.map((run) => {
                const pct =
                  run.total_traces > 0
                    ? Math.round(
                        ((run.completed_traces + run.failed_traces) / run.total_traces) * 100,
                      )
                    : 0
                return (
                  <tr
                    key={run.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/runs/${run.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-700">#{run.id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[run.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-24">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {run.completed_traces + run.failed_traces}/{run.total_traces}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {run.avg_score != null ? run.avg_score.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => handleDelete(e, run.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
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
