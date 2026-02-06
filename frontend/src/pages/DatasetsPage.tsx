import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import EmptyState from '../components/layout/EmptyState'
import ErrorState from '../components/layout/ErrorState'
import { useDatasets, useCreateDataset, useDeleteDataset, useAddTracesToDataset } from '../hooks/useDatasets'
import { useTraces } from '../hooks/useTraces'
import { listTraces } from '../api/traces'

export default function DatasetsPage() {
  const { data, isLoading, isError, refetch } = useDatasets()
  const { data: tracesData } = useTraces({ limit: 1 })
  const createMutation = useCreateDataset()
  const addTracesMutation = useAddTracesToDataset()
  const deleteMutation = useDeleteDataset()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [createFromAllError, setCreateFromAllError] = useState<string | null>(null)
  const [creatingFromAll, setCreatingFromAll] = useState(false)

  // When there are no datasets, show the create form so users can add one without hunting for the button
  useEffect(() => {
    if (!isLoading && data?.total === 0) {
      setShowCreate(true)
    }
  }, [isLoading, data?.total])

  const handleCreate = async () => {
    if (!name.trim()) return
    try {
      await createMutation.mutateAsync({ name: name.trim(), description: description.trim() || undefined })
      setName('')
      setDescription('')
      setShowCreate(false)
    } catch {
      // Error is shown via createMutation.isError below; keep form open
    }
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this dataset?')) {
      deleteMutation.mutate(id)
    }
  }

  /** Create one dataset and add all imported traces so it shows up on this page. */
  const handleCreateFromAllTraces = async () => {
    setCreateFromAllError(null)
    setCreatingFromAll(true)
    try {
      const pageSize = 200
      let offset = 0
      const allTraceIds: string[] = []
      let total = 0
      while (true) {
        const res = await listTraces({ limit: pageSize, offset })
        res.items.forEach((t) => allTraceIds.push(t.id))
        total = res.total
        if (res.items.length < pageSize || allTraceIds.length >= total) break
        offset += pageSize
      }
      if (allTraceIds.length === 0) {
        setCreateFromAllError('No traces found. Import traces on the Traces page first.')
        return
      }
      const dataset = await createMutation.mutateAsync({
        name: 'All traces',
        description: total > 0 ? `${total} imported trace${total !== 1 ? 's' : ''}` : undefined,
      })
      await addTracesMutation.mutateAsync({ datasetId: dataset.id, traceIds: allTraceIds })
      setShowCreate(false)
      navigate(`/datasets/${dataset.id}`)
    } catch (e) {
      setCreateFromAllError((e as Error)?.message ?? 'Failed to create dataset from traces.')
    } finally {
      setCreatingFromAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datasets"
        description="Datasets don't appear automatically. Create a dataset (or use the shortcut below), then add traces to it. Import traces on the Traces page first."
      >
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Dataset
        </button>
      </PageHeader>

      {showCreate && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Create New Dataset</h3>
          {createMutation.isError && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {(() => {
                const err = createMutation.error as Error & { response?: { data?: { detail?: string | unknown[] } } }
                const detail = err.response?.data?.detail
                if (typeof detail === 'string') return detail
                if (Array.isArray(detail) && detail.length > 0) {
                  const first = detail[0]
                  return typeof first === 'object' && first !== null && 'msg' in first
                    ? String((first as { msg: string }).msg)
                    : JSON.stringify(detail[0])
                }
                return err.message ?? 'Failed to create dataset. Please try again.'
              })()}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Chatbot QA Set"
                autoComplete="off"
              />
              {!name.trim() && (
                <p className="mt-1 text-xs text-gray-500">Enter a name to enable Create.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); createMutation.reset() }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState message="Failed to load datasets." onRetry={() => refetch()} />
      ) : !data || data.total === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="No datasets yet."
            description="Create a dataset to organize traces into curated collections."
            actionLabel="New Dataset"
            onAction={() => setShowCreate(true)}
          />
          {(tracesData?.total ?? 0) > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-600 mb-3">
                You have <strong>{tracesData!.total}</strong> imported trace{tracesData!.total !== 1 ? 's' : ''}. Create a dataset that includes all of them so it appears here.
              </p>
              {createFromAllError && (
                <div className="rounded-md bg-red-50 border border-red-200 p-2 text-sm text-red-700 mb-3 text-left max-w-md mx-auto">
                  {createFromAllError}
                </div>
              )}
              <button
                type="button"
                onClick={handleCreateFromAllTraces}
                disabled={creatingFromAll}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {creatingFromAll ? 'Creating dataset and adding traces…' : 'Create dataset from all traces'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traces</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.map((ds) => (
                <tr
                  key={ds.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/datasets/${ds.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{ds.name}</div>
                    {ds.description && (
                      <div className="text-xs text-gray-500 truncate max-w-xs">{ds.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{ds.trace_count}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">v{ds.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleDelete(e, ds.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
