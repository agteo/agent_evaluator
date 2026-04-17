interface TraceFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  tag: string
  onTagChange: (value: string) => void
  userId: string
  onUserIdChange: (value: string) => void
  version: string
  onVersionChange: (value: string) => void
  release: string
  onReleaseChange: (value: string) => void
  hasScores: string
  onHasScoresChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortDir: string
  onSortDirChange: (value: string) => void
}

export default function TraceFilters({
  search,
  onSearchChange,
  tag,
  onTagChange,
  userId,
  onUserIdChange,
  version,
  onVersionChange,
  release,
  onReleaseChange,
  hasScores,
  onHasScoresChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}: TraceFiltersProps) {
  return (
    <div className="panel rounded-3xl p-5">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))]">
        <input
          type="text"
          placeholder="Search traces by name or ID"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Tag"
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
        />
        <input
          type="text"
          placeholder="User"
          value={userId}
          onChange={(e) => onUserIdChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Version"
          value={version}
          onChange={(e) => onVersionChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Release"
          value={release}
          onChange={(e) => onReleaseChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none"
        />
        <select
          value={hasScores}
          onChange={(e) => onHasScoresChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
        >
          <option value="">Any score state</option>
          <option value="true">Has scores</option>
          <option value="false">No scores</option>
        </select>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-teal-600 focus:outline-none"
        >
          <option value="imported_at">Import Date</option>
          <option value="timestamp">Trace Date</option>
          <option value="name">Name</option>
          <option value="total_cost">Cost</option>
          <option value="latency_ms">Latency</option>
        </select>
        <button
          onClick={() => onSortDirChange(sortDir === 'desc' ? 'asc' : 'desc')}
          className="button-secondary px-4 py-3 text-sm"
          title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        >
          {sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>
    </div>
  )
}
