import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import EmptyState from '../components/layout/EmptyState'
import ErrorState from '../components/layout/ErrorState'
import { useEvalConfigs, useDeleteEvalConfig } from '../hooks/useEvals'

export default function EvalsPage() {
  const { data, isLoading, isError, refetch } = useEvalConfigs()
  const deleteMutation = useDeleteEvalConfig()
  const navigate = useNavigate()

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (confirm('Delete this eval config?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eval Configs"
        description="Create and manage evaluation rubrics and prompt templates"
      >
        <Link
          to="/evals/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Config
        </Link>
      </PageHeader>

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState message="Failed to load eval configs." onRetry={() => refetch()} />
      ) : !data || data.total === 0 ? (
        <EmptyState
          title="No evaluation configs yet."
          description="Create an eval config to define how traces should be evaluated."
          actionLabel="Create Config"
          actionTo="/evals/new"
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider / Model</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Criteria</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scale</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.map((config) => (
                <tr
                  key={config.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/evals/${config.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{config.name}</div>
                    {config.description && (
                      <div className="text-xs text-gray-500 break-words max-w-xs">{config.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-mono">
                      {config.provider}
                    </span>{' '}
                    <span className="text-gray-400">/</span>{' '}
                    <span className="text-xs">{config.model}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {config.criteria.length} criteria
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {config.scale_min} – {config.scale_max}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(config.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleDelete(e, config.id)}
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
