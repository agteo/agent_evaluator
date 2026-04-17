import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import ErrorState from '../components/layout/ErrorState'
import {
  useDataset,
  useDatasetTraces,
  useAddTracesToDataset,
  useRemoveTracesFromDataset,
} from '../hooks/useDatasets'
import { useTraces } from '../hooks/useTraces'

export default function DatasetDetailPage() {
  const { datasetId } = useParams()
  const navigate = useNavigate()
  const numericId = Number(datasetId)

  const { data: dataset, isLoading } = useDataset(numericId)
  const { data: traces } = useDatasetTraces(numericId)
  const addMutation = useAddTracesToDataset()
  const removeMutation = useRemoveTracesFromDataset()

  const [showAddPanel, setShowAddPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(0)

  const totalTraces = traces?.length ?? 0
  const totalPages = Math.max(1, Math.ceil(totalTraces / pageSize))
  const boundedPage = Math.min(currentPage, Math.max(0, totalPages - 1))
  const pageTraces = useMemo(
    () => traces?.slice(boundedPage * pageSize, boundedPage * pageSize + pageSize) ?? [],
    [boundedPage, pageSize, traces],
  )

  const { data: availableTraces } = useTraces(
    showAddPanel ? { search: search || undefined, limit: 50 } : undefined,
  )

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAdd = async () => {
    if (selected.size === 0) return
    await addMutation.mutateAsync({
      datasetId: numericId,
      traceIds: Array.from(selected),
    })
    setSelected(new Set())
    setShowAddPanel(false)
  }

  const handleRemove = async (traceId: string) => {
    await removeMutation.mutateAsync({
      datasetId: numericId,
      traceIds: [traceId],
    })
  }

  if (isLoading) {
    return <LoadingState rows={3} />
  }

  if (!dataset) {
    return <ErrorState message="Dataset not found." onRetry={() => navigate('/datasets')} />
  }

  return (
    <div className="space-y-6">
      <PageHeader title={dataset.name} description={dataset.description || undefined}>
        <button onClick={() => navigate('/datasets')} className="button-secondary px-4 py-2 text-sm font-medium">
          Back
        </button>
        <button onClick={() => setShowAddPanel(!showAddPanel)} className="button-primary px-4 py-2 text-sm font-medium">
          Add Traces
        </button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Traces</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{dataset.trace_count}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Version</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">v{dataset.version}</p>
        </div>
        <div className="metric-card rounded-3xl p-5">
          <p className="text-sm text-slate-500">Last updated</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{new Date(dataset.updated_at).toLocaleString()}</p>
        </div>
      </div>

      {showAddPanel && (
        <div className="panel rounded-3xl border border-teal-200 p-6 space-y-4">
          <h3 className="text-sm font-medium text-slate-900">Select Traces to Add</h3>
          <p className="text-sm text-slate-500">
            These are traces you imported on the Traces page. Search and select to add them to this dataset.
          </p>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traces..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
          />
          <div className="max-h-64 divide-y overflow-y-auto rounded-2xl border border-slate-200">
            {availableTraces?.items.map((trace) => {
              const alreadyIn = traces?.some((existing) => existing.id === trace.id)
              return (
                <label
                  key={trace.id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-3 text-sm hover:bg-slate-50 ${alreadyIn ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(trace.id)}
                    onChange={() => toggleSelect(trace.id)}
                    disabled={alreadyIn}
                    className="rounded border-gray-300"
                  />
                  <span className="font-mono text-xs text-slate-500">{trace.id.slice(0, 12)}...</span>
                  <span className="text-slate-800">{trace.name || 'unnamed'}</span>
                  {alreadyIn && <span className="text-xs text-slate-400">(already added)</span>}
                </label>
              )
            })}
            {(!availableTraces || availableTraces.items.length === 0) && (
              <div className="px-3 py-4 text-center text-sm text-slate-400">No traces found</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={selected.size === 0 || addMutation.isPending}
              className="button-primary px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {addMutation.isPending ? 'Adding...' : `Add ${selected.size} Trace${selected.size !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => {
                setShowAddPanel(false)
                setSelected(new Set())
              }}
              className="button-secondary px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="panel rounded-3xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
          <h3 className="text-sm font-medium text-slate-700">Traces in Dataset</h3>
          {traces && traces.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                Per page
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(0)
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-1 text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <span className="text-slate-500">
                Showing {totalTraces === 0 ? 0 : boundedPage * pageSize + 1}-
                {Math.min((boundedPage + 1) * pageSize, totalTraces)} of {totalTraces}
              </span>
            </div>
          )}
        </div>
        {!traces || traces.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No traces in this dataset yet. Click "Add Traces" to get started.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200/80">
              {pageTraces.map((trace) => (
                <div
                  key={trace.id}
                  className="grid gap-3 px-5 py-4 lg:grid-cols-[minmax(0,2fr)_140px_120px_120px] lg:items-center"
                >
                  <div className="min-w-0">
                    <Link to={`/traces/${trace.id}`} className="font-medium text-slate-900 hover:text-teal-700">
                      {trace.name || trace.id}
                    </Link>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {trace.output_preview || trace.input_preview || trace.id}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {trace.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="mr-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="text-sm text-slate-600">
                    {trace.latency_ms != null ? `${Math.round(trace.latency_ms)}ms` : '-'}
                  </div>
                  <button
                    onClick={() => handleRemove(trace.id)}
                    disabled={removeMutation.isPending}
                    className="text-left text-xs font-medium text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {totalTraces > pageSize && (
              <div className="flex items-center justify-between border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                  disabled={boundedPage === 0}
                  className="button-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-slate-600">
                  Page {boundedPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
                  disabled={boundedPage >= totalPages - 1}
                  className="button-secondary px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
