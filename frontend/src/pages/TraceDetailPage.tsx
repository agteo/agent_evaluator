import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import { useTrace, useDeleteTrace } from '../hooks/useTraces'

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (data == null) return null
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{label}</h3>
      <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs overflow-y-auto max-h-80 whitespace-pre-wrap break-words min-w-0">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default function TraceDetailPage() {
  const { traceId } = useParams()
  const navigate = useNavigate()
  const { data: trace, isLoading, isError } = useTrace(traceId)
  const deleteMutation = useDeleteTrace()

  if (isLoading) {
    return <LoadingState rows={4} />
  }

  if (isError || !trace) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Trace not found.</p>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to traces
        </button>
      </div>
    )
  }

  const handleDelete = () => {
    if (!confirm('Delete this trace?')) return
    deleteMutation.mutate(trace.id, {
      onSuccess: () => navigate('/'),
    })
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Prominent back link so users can easily leave the detail view */}
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Traces
        </button>
      </div>
      <PageHeader title={trace.name || `Trace ${trace.id}`}>
        <button
          onClick={() => navigate('/')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleDelete}
          className="rounded-md bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700"
        >
          Delete
        </button>
      </PageHeader>

      {/* Metadata row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'ID', value: trace.id },
          { label: 'External ID', value: trace.external_id },
          { label: 'Source', value: trace.source_type },
          {
            label: 'Connection',
            value: trace.source_connection_id != null ? String(trace.source_connection_id) : null,
          },
          { label: 'Session', value: trace.session_id },
          { label: 'User', value: trace.user_id },
          {
            label: 'Timestamp',
            value: trace.timestamp
              ? new Date(trace.timestamp).toLocaleString()
              : null,
          },
          {
            label: 'Cost',
            value:
              trace.total_cost != null ? `$${trace.total_cost.toFixed(4)}` : null,
          },
          {
            label: 'Latency',
            value:
              trace.latency_ms != null
                ? trace.latency_ms >= 1000
                  ? `${(trace.latency_ms / 1000).toFixed(1)}s`
                  : `${Math.round(trace.latency_ms)}ms`
                : null,
          },
          { label: 'Version', value: trace.version },
          { label: 'Release', value: trace.release },
        ]
          .filter((item) => item.value)
          .map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-3 min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-medium text-gray-900 font-mono break-words">
                {value}
              </p>
            </div>
          ))}
      </div>

      {/* Tags */}
      {trace.tags && trace.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1">
            {trace.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* JSON sections */}
      <div className="space-y-4">
        <JsonBlock label="Input" data={trace.input} />
        <JsonBlock label="Output" data={trace.output} />
        <JsonBlock label="Metadata" data={trace.metadata_} />
        <JsonBlock label="Scores" data={trace.scores} />
        <JsonBlock label="Observations" data={trace.observations} />
      </div>
    </div>
  )
}
