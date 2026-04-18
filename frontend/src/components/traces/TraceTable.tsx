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
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No traces found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Source
            </th>
            <th className="max-w-[200px] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Preview
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Tags
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Cost
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Latency
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Date
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {traces.map((trace) => (
            <tr
              key={trace.id}
              onClick={() => navigate(`/traces/${trace.id}`)}
              className="cursor-pointer transition-colors hover:bg-gray-50"
            >
              <td className="max-w-[160px] break-words px-4 py-3 font-mono text-sm text-gray-600">
                {trace.id}
              </td>
              <td className="break-words px-4 py-3 text-sm text-gray-900">
                {trace.name || <span className="italic text-gray-400">unnamed</span>}
              </td>
              <td className="max-w-[180px] break-words px-4 py-3 text-xs text-gray-600">
                <div className="space-y-1">
                  <div>{trace.source_type || 'manual import'}</div>
                  {trace.external_id && trace.external_id !== trace.id && (
                    <div className="font-mono text-[11px] text-gray-500">{trace.external_id}</div>
                  )}
                </div>
              </td>
              <td
                className="max-w-[200px] break-words px-4 py-3 text-xs text-gray-600"
                title={trace.output_preview || trace.input_preview || ''}
              >
                {trace.output_preview || trace.input_preview || '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {trace.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-600">
                {trace.total_cost != null ? `$${trace.total_cost.toFixed(4)}` : '-'}
              </td>
              <td className="px-4 py-3 text-right text-sm text-gray-600">
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
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-white disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(offset + limit)}
              disabled={offset + limit >= total}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
