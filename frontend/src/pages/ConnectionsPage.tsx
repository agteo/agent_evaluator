import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import LoadingState from '../components/layout/LoadingState'
import EmptyState from '../components/layout/EmptyState'
import ErrorState from '../components/layout/ErrorState'
import {
  useConnectionSyncRuns,
  useConnections,
  useCreateConnection,
  useDeleteConnection,
  useSyncConnection,
  useTestConnection,
  useUpdateConnection,
} from '../hooks/useConnections'
import type { Connection } from '../types'

function formatDate(value: string | null) {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function providerLabel(provider: string) {
  if (provider === 'langfuse_api') return 'Langfuse API'
  return provider
}

export default function ConnectionsPage() {
  const { data, isLoading, isError, refetch } = useConnections()
  const createMutation = useCreateConnection()
  const updateMutation = useUpdateConnection()
  const deleteMutation = useDeleteConnection()
  const testMutation = useTestConnection()
  const syncMutation = useSyncConnection()

  const [showCreate, setShowCreate] = useState(false)
  const [editingConnectionId, setEditingConnectionId] = useState<number | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://cloud.langfuse.com')
  const [publicKey, setPublicKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [batchSize, setBatchSize] = useState(50)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(60)

  useEffect(() => {
    if (!selectedConnectionId && data && data.length > 0) {
      setSelectedConnectionId(data[0].id)
    }
  }, [data, selectedConnectionId])

  useEffect(() => {
    if (!isLoading && (data?.length ?? 0) === 0) {
      setShowCreate(true)
    }
  }, [isLoading, data?.length])

  useEffect(() => {
    if (!editingConnectionId) return
    const connection = data?.find((item) => item.id === editingConnectionId)
    if (!connection) return
    setName(connection.name)
    setBaseUrl(connection.config.base_url)
    setPublicKey(connection.config.public_key)
    setSecretKey('')
    setBatchSize(connection.config.batch_size)
    setScheduleEnabled(connection.schedule_enabled)
    setSyncIntervalMinutes(connection.sync_interval_minutes ?? 60)
  }, [data, editingConnectionId])

  const selectedConnection = useMemo(
    () => data?.find((connection) => connection.id === selectedConnectionId) ?? null,
    [data, selectedConnectionId],
  )

  const {
    data: syncRuns,
    isLoading: syncRunsLoading,
    refetch: refetchSyncRuns,
  } = useConnectionSyncRuns(selectedConnection?.id ?? null)

  async function handleCreate() {
    if (!name.trim() || !baseUrl.trim() || !publicKey.trim() || !secretKey.trim()) return
    try {
      const created = await createMutation.mutateAsync({
        name: name.trim(),
        provider: 'langfuse_api',
        config: {
          base_url: baseUrl.trim(),
          public_key: publicKey.trim(),
          secret_key: secretKey.trim(),
          batch_size: batchSize,
        },
        schedule_enabled: scheduleEnabled,
        sync_interval_minutes: scheduleEnabled ? syncIntervalMinutes : undefined,
      })
      setSelectedConnectionId(created.id)
      setName('')
      setPublicKey('')
      setSecretKey('')
      setBatchSize(50)
      setScheduleEnabled(false)
      setSyncIntervalMinutes(60)
      setShowCreate(false)
    } catch {
      // surfaced below
    }
  }

  async function handleUpdate() {
    if (!editingConnectionId || !name.trim() || !baseUrl.trim() || !publicKey.trim() || !secretKey.trim()) return
    try {
      await updateMutation.mutateAsync({
        connectionId: editingConnectionId,
        data: {
          name: name.trim(),
          provider: 'langfuse_api',
          config: {
            base_url: baseUrl.trim(),
            public_key: publicKey.trim(),
            secret_key: secretKey.trim(),
            batch_size: batchSize,
          },
          schedule_enabled: scheduleEnabled,
          sync_interval_minutes: scheduleEnabled ? syncIntervalMinutes : undefined,
        },
      })
      setEditingConnectionId(null)
      setShowCreate(false)
      resetForm()
    } catch {
      // surfaced below
    }
  }

  function resetForm() {
    setName('')
    setBaseUrl('https://cloud.langfuse.com')
    setPublicKey('')
    setSecretKey('')
    setBatchSize(50)
    setScheduleEnabled(false)
    setSyncIntervalMinutes(60)
  }

  async function handleDelete(connection: Connection) {
    if (!confirm(`Delete connection "${connection.name}"? This will also remove its sync history.`)) return
    await deleteMutation.mutateAsync(connection.id)
    if (selectedConnectionId === connection.id) {
      setSelectedConnectionId(null)
    }
    if (editingConnectionId === connection.id) {
      setEditingConnectionId(null)
      setShowCreate(false)
      resetForm()
    }
  }

  async function handleTest(connection: Connection) {
    await testMutation.mutateAsync(connection.id)
  }

  async function handleSync(connection: Connection) {
    await syncMutation.mutateAsync(connection.id)
    await refetchSyncRuns()
  }

  const busyConnectionId =
    (testMutation.isPending ? testMutation.variables : null) ??
    (syncMutation.isPending ? syncMutation.variables : null)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connections"
        description="Connect external trace sources, verify access, and pull traces into Evaluator with manual sync by default."
      >
        <button
          onClick={() => setShowCreate((open) => !open)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Connection
        </button>
      </PageHeader>

      {showCreate && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h3 className="text-sm font-medium text-gray-900">
            {editingConnectionId ? 'Edit Langfuse Connection' : 'Add Langfuse Connection'}
          </h3>
          {(createMutation.isError || updateMutation.isError) && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {((updateMutation.error || createMutation.error) as Error)?.message ||
                'Failed to save connection.'}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Connection name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. Production Langfuse"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Base URL</label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="https://cloud.langfuse.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Public key</label>
              <input
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="pk-lf-..."
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Secret key</label>
              <input
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={editingConnectionId ? 'Enter secret key again to save changes' : 'sk-lf-...'}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Batch size</label>
              <input
                type="number"
                min={1}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value) || 50)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Manual sync is the default. Scheduled sync settings are stored now and can be activated later.
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">Enable scheduled sync</span>
                <span className="block text-sm text-slate-600">
                  Stored on the connection now. Worker-based execution still needs to be built.
                </span>
              </span>
            </label>
            {scheduleEnabled && (
              <div className="mt-3 max-w-xs">
                <label className="mb-1 block text-sm font-medium text-gray-700">Sync interval (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={syncIntervalMinutes}
                  onChange={(e) => setSyncIntervalMinutes(Number(e.target.value) || 60)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={editingConnectionId ? handleUpdate : handleCreate}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !name.trim() ||
                !baseUrl.trim() ||
                !publicKey.trim() ||
                !secretKey.trim()
              }
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending
                ? 'Creating...'
                : updateMutation.isPending
                  ? 'Saving...'
                  : editingConnectionId
                    ? 'Save changes'
                    : 'Create connection'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false)
                setEditingConnectionId(null)
                createMutation.reset()
                updateMutation.reset()
                resetForm()
              }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <LoadingState rows={3} />
      ) : isError ? (
        <ErrorState message="Failed to load connections." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No connections yet."
          description="Add a Langfuse connection to test access and pull traces into the workspace."
          actionLabel="New Connection"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-medium text-slate-900">Configured sources</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {data.map((connection) => {
                const isSelected = connection.id === selectedConnectionId
                const isBusy = busyConnectionId === connection.id
                return (
                  <div
                    key={connection.id}
                    className={`cursor-pointer px-5 py-4 transition ${
                      isSelected ? 'bg-sky-50' : 'hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedConnectionId(connection.id)}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-medium text-slate-900">{connection.name}</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            {providerLabel(connection.provider)}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              connection.status === 'active'
                                ? 'bg-emerald-100 text-emerald-700'
                                : connection.status === 'error'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {connection.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          <p>{connection.config.base_url}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">{connection.config.public_key}</p>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                          <span>Last sync: {formatDate(connection.last_sync_at)}</span>
                          <span>Batch size: {connection.config.batch_size}</span>
                          {connection.schedule_enabled && (
                            <span>Scheduled: every {connection.sync_interval_minutes} min</span>
                          )}
                        </div>
                        {connection.last_error && (
                          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {connection.last_error}
                          </div>
                        )}
                        {testMutation.isSuccess && testMutation.variables === connection.id && (
                          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                            Connection test passed.{' '}
                            {'project_count' in testMutation.data.details
                              ? `Projects visible: ${String(testMutation.data.details.project_count)}`
                              : 'Credentials and base URL look valid.'}
                          </div>
                        )}
                        {testMutation.isError && testMutation.variables === connection.id && (
                          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {(testMutation.error as Error).message || 'Connection test failed.'}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingConnectionId(connection.id)
                            setShowCreate(true)
                          }}
                          disabled={isBusy}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTest(connection)
                          }}
                          disabled={isBusy}
                          className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {testMutation.isPending && testMutation.variables === connection.id ? 'Testing...' : 'Test'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSync(connection)
                          }}
                          disabled={isBusy}
                          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {syncMutation.isPending && syncMutation.variables === connection.id ? 'Syncing...' : 'Sync now'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(connection)
                          }}
                          disabled={deleteMutation.isPending}
                          className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="text-sm font-medium text-slate-900">Sync history</h2>
              {selectedConnection && (
                <p className="mt-1 text-sm text-slate-600">
                  {selectedConnection.name} · {providerLabel(selectedConnection.provider)}
                </p>
              )}
            </div>
            {!selectedConnection ? (
              <div className="p-6 text-sm text-slate-500">Select a connection to inspect its recent sync runs.</div>
            ) : syncRunsLoading ? (
              <div className="p-6">
                <LoadingState rows={3} />
              </div>
            ) : !syncRuns || syncRuns.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No sync runs yet. Test the connection and run the first manual sync.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {syncRuns.map((run) => (
                  <div key={run.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            run.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : run.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {run.status}
                        </span>
                        <span className="text-sm font-medium text-slate-900">Run #{run.id}</span>
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(run.started_at)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-600">
                      <div>Imported: <span className="font-medium text-slate-900">{run.imported}</span></div>
                      <div>Updated: <span className="font-medium text-slate-900">{run.updated}</span></div>
                      <div>Skipped: <span className="font-medium text-slate-900">{run.skipped}</span></div>
                      <div>Errors: <span className="font-medium text-slate-900">{run.error_count}</span></div>
                    </div>
                    {run.details && (
                      <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Fetched: {String(run.details.fetched ?? '-')}
                        {run.details.next_cursor ? ` · Next cursor: ${String(run.details.next_cursor)}` : ''}
                      </div>
                    )}
                    {run.error_message && (
                      <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {run.error_message}
                      </div>
                    )}
                    {run.errors && run.errors.length > 0 && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <p className="font-medium">Normalization issues</p>
                        <ul className="mt-2 list-disc pl-5">
                          {run.errors.slice(0, 4).map((error, index) => (
                            <li key={`${run.id}-${index}`}>{error}</li>
                          ))}
                        </ul>
                        {run.errors.length > 4 && (
                          <p className="mt-2 text-xs text-amber-700">Showing 4 of {run.errors.length} errors.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
