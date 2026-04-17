import { useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import TraceUpload from '../components/traces/TraceUpload'
import TraceTable from '../components/traces/TraceTable'
import TraceFilters from '../components/traces/TraceFilters'
import { useTraces } from '../hooks/useTraces'

export default function TracesPage() {
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState('')
  const [userId, setUserId] = useState('')
  const [version, setVersion] = useState('')
  const [release, setRelease] = useState('')
  const [hasScores, setHasScores] = useState('')
  const [sortBy, setSortBy] = useState('imported_at')
  const [sortDir, setSortDir] = useState('desc')
  const [offset, setOffset] = useState(0)
  const limit = 50

  const { data, isLoading } = useTraces({
    search: search || undefined,
    tag: tag || undefined,
    user_id: userId || undefined,
    version: version || undefined,
    release: release || undefined,
    has_scores: hasScores ? hasScores === 'true' : undefined,
    sort_by: sortBy,
    sort_dir: sortDir,
    offset,
    limit,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traces"
        description="Explore imported traces, slice by metadata, and inspect the examples that explain evaluation outcomes."
      />

      <TraceUpload />

      {(data?.total ?? 0) > 0 && (
        <>
          <TraceFilters
            search={search}
            onSearchChange={(value) => {
              setSearch(value)
              setOffset(0)
            }}
            tag={tag}
            onTagChange={(value) => {
              setTag(value)
              setOffset(0)
            }}
            userId={userId}
            onUserIdChange={(value) => {
              setUserId(value)
              setOffset(0)
            }}
            version={version}
            onVersionChange={(value) => {
              setVersion(value)
              setOffset(0)
            }}
            release={release}
            onReleaseChange={(value) => {
              setRelease(value)
              setOffset(0)
            }}
            hasScores={hasScores}
            onHasScoresChange={(value) => {
              setHasScores(value)
              setOffset(0)
            }}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            sortDir={sortDir}
            onSortDirChange={setSortDir}
          />

          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading traces...</div>
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
