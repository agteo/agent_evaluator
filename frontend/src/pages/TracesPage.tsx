import { useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import TraceUpload from '../components/traces/TraceUpload'
import TraceTable from '../components/traces/TraceTable'
import TraceFilters from '../components/traces/TraceFilters'
import { useTraces } from '../hooks/useTraces'

export default function TracesPage() {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('imported_at')
  const [sortDir, setSortDir] = useState('desc')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const { data, isLoading } = useTraces({
    search: search || undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
    offset,
    limit,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traces"
        description="Import and browse Langfuse trace exports"
      />

      <TraceUpload />

      {(data?.total ?? 0) > 0 && (
        <>
          <TraceFilters
            search={search}
            onSearchChange={(v) => {
              setSearch(v)
              setOffset(0)
            }}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
          />

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading traces...</div>
          ) : (
            <TraceTable
              traces={data!.items}
              total={data!.total}
              offset={offset}
              limit={limit}
              onPageChange={setOffset}
            />
          )}
        </>
      )}
    </div>
  )
}
