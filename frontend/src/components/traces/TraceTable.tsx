import { useNavigate } from 'react-router-dom'
import type { TraceSummary } from '../../types'

interface TraceTableProps {
  traces: TraceSummary[]
  total: number
  offset: number
  limit: number
  onPageChange: (offset: number) => void
}

export default function TraceTable({
  traces,
  total,
  offset,
  limit,
  onPageChange,
}: TraceTableProps) {
  const navigate = useNavigate()
  const page = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  if (traces.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        No traces found.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider max-w-[200px]">
              Preview
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tags
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Latency
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {traces.map((trace) => (
            <tr
              key={trace.id}
              onClick={() => navigate(`/traces/${trace.id}`)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-sm font-mono text-gray-600 truncate max-w-[160px]">
                {trace.id}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {trace.name || <span className="text-gray-400 italic">unnamed</span>}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate" title={trace.output_preview || trace.input_preview || ''}>
                {trace.output_preview || trace.input_preview || '—'}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {trace.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">
                {trace.total_cost != null ? `$${trace.total_cost.toFixed(4)}` : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-right text-gray-600">
                {trace.latency_ms != null
                  ? trace.latency_ms >= 1000
                    ? `${(trace.latency_ms / 1000).toFixed(1)}s`
                    : `${Math.round(trace.latency_ms)}ms`
                  : '-'}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {trace.timestamp
                  ? new Date(trace.timestamp).toLocaleDateString()
                  : new Date(trace.imported_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-700">
            Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-white"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50 hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
