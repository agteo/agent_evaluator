interface TraceFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  sortBy: string
  onSortByChange: (value: string) => void
  sortDir: string
  onSortDirChange: (value: string) => void
}

export default function TraceFilters({
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
}: TraceFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search traces by name or ID..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>
      <select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      >
        <option value="imported_at">Import Date</option>
        <option value="timestamp">Trace Date</option>
        <option value="name">Name</option>
        <option value="total_cost">Cost</option>
        <option value="latency_ms">Latency</option>
      </select>
      <button
        onClick={() => onSortDirChange(sortDir === 'desc' ? 'asc' : 'desc')}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none"
        title={sortDir === 'desc' ? 'Newest first' : 'Oldest first'}
      >
        {sortDir === 'desc' ? '↓' : '↑'}
      </button>
    </div>
  )
}
