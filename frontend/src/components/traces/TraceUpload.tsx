import { useCallback, useState } from 'react'
import { useImportTraces } from '../../hooks/useTraces'

export default function TraceUpload() {
  const [dragOver, setDragOver] = useState(false)
  const importMutation = useImportTraces()

  const handleFile = useCallback(
    (file: File) => {
      importMutation.mutate(file)
    },
    [importMutation],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile],
  )

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => document.getElementById('trace-file-input')?.click()}
      >
        <input
          id="trace-file-input"
          type="file"
          accept=".json,.jsonl"
          onChange={onFileSelect}
          className="hidden"
        />
        <svg
          className="mx-auto h-10 w-10 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">Click to upload</span> or drag
          and drop
        </p>
        <p className="text-xs text-gray-500 mt-1">Langfuse JSON or JSONL export</p>
      </div>

      {importMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Importing traces...
        </div>
      )}

      {importMutation.isSuccess && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm">
          <p className="text-green-800">
            Imported <strong>{importMutation.data.imported}</strong> traces
            {importMutation.data.skipped > 0 && (
              <>, skipped <strong>{importMutation.data.skipped}</strong> duplicates</>
            )}
          </p>
          {importMutation.data.errors.length > 0 && (
            <ul className="mt-1 text-red-600 text-xs">
              {importMutation.data.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {importMutation.isError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          Import failed: {(importMutation.error as Error).message}
        </div>
      )}
    </div>
  )
}
