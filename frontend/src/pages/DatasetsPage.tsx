import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import EmptyState from '../components/layout/EmptyState'
import ErrorState from '../components/layout/ErrorState'
import { useDatasets, useCreateDataset, useDeleteDataset } from '../hooks/useDatasets'

export default function DatasetsPage() {
  const { data, isLoading, isError, refetch } = useDatasets()
  const createMutation = useCreateDataset()
  const deleteMutation = useDeleteDataset()
  const navigate = useNavigate()

  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    await createMutation.mutateAsync({ name: name.trim(), description: description.trim() || undefined })
    setName('')
    setDescription('')
    setShowCreate(false)
  }

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this dataset?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Datasets"
        description="Organize traces into curated collections for evaluation"
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Chatbot QA Set"
              />
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
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
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
        <EmptyState
          title="No datasets yet."
          description="Create a dataset to organize traces into curated collections."
          actionLabel="New Dataset"
          onAction={() => setShowCreate(true)}
        />
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
