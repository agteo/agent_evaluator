import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../components/layout/PageHeader'
import { useTrace, useDeleteTrace } from '../hooks/useTraces'

function JsonBlock({ label, data }: { label: string; data: unknown }) {
  if (data == null) return null
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 mb-1">{label}</h3>
      <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs overflow-auto max-h-80">
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
    return <div className="text-center py-12 text-gray-500">Loading trace...</div>
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
    <div className="space-y-6">
      <PageHeader title={trace.name || `Trace ${trace.id}`}>
        <button
          onClick={() => navigate('/')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
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
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-sm font-medium text-gray-900 font-mono truncate">
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
