import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useDataset, useDatasetTraces, useAddTracesToDataset, useRemoveTracesFromDataset } from '../hooks/useDatasets'
import { useTraces } from '../hooks/useTraces'

export default function DatasetDetailPage() {
  const { datasetId } = useParams()
  const navigate = useNavigate()
  const numericId = Number(datasetId)

  const { data: dataset, isLoading } = useDataset(numericId)
  const { data: traceIds } = useDatasetTraces(numericId)
  const addMutation = useAddTracesToDataset()
  const removeMutation = useRemoveTracesFromDataset()

  const [showAddPanel, setShowAddPanel] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Fetch available traces for the add panel
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
    return <div className="text-center py-8 text-gray-500">Loading dataset...</div>
  }

  if (!dataset) {
    return <div className="text-center py-8 text-gray-500">Dataset not found</div>
  }

  return (
    <div className="space-y-6">
      <PageHeader title={dataset.name} description={dataset.description || undefined}>
        <button
          onClick={() => navigate('/datasets')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Add Traces
        </button>
      </PageHeader>

      {/* Dataset metadata */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Traces:</span>{' '}
            <span className="font-medium">{dataset.trace_count}</span>
          </div>
          <div>
            <span className="text-gray-500">Version:</span>{' '}
            <span className="font-medium">v{dataset.version}</span>
          </div>
          <div>
            <span className="text-gray-500">Updated:</span>{' '}
            <span className="font-medium">{new Date(dataset.updated_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Add traces panel */}
      {showAddPanel && (
        <div className="bg-white rounded-lg border border-blue-200 p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Select Traces to Add</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search traces..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md divide-y">
            {availableTraces?.items.map((t) => {
              const alreadyIn = traceIds?.includes(t.id)
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer ${alreadyIn ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    disabled={alreadyIn}
                    className="rounded border-gray-300"
                  />
                  <span className="font-mono text-xs text-gray-600">{t.id.slice(0, 12)}...</span>
                  <span className="text-gray-800">{t.name || 'unnamed'}</span>
                  {alreadyIn && <span className="text-xs text-gray-400">(already added)</span>}
                </label>
              )
            })}
            {(!availableTraces || availableTraces.items.length === 0) && (
              <div className="px-3 py-4 text-center text-gray-400 text-sm">No traces found</div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={selected.size === 0 || addMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {addMutation.isPending ? 'Adding...' : `Add ${selected.size} Trace${selected.size !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => { setShowAddPanel(false); setSelected(new Set()) }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current traces in dataset */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">Traces in Dataset</h3>
        </div>
        {!traceIds || traceIds.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No traces in this dataset yet. Click "Add Traces" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {traceIds.map((tid) => (
              <div key={tid} className="flex items-center justify-between px-4 py-2">
                <span className="font-mono text-sm text-gray-700">{tid}</span>
                <button
                  onClick={() => handleRemove(tid)}
                  disabled={removeMutation.isPending}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
