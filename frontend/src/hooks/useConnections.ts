import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createConnection,
  deleteConnection,
  listConnections,
  listConnectionSyncRuns,
  syncConnection,
  testConnection,
  updateConnection,
} from '../api/connections'

export function useConnections() {
  return useQuery({
    queryKey: ['connections'],
    queryFn: listConnections,
  })
}

export function useConnectionSyncRuns(connectionId: number | null) {
  return useQuery({
    queryKey: ['connection-sync-runs', connectionId],
    queryFn: () => listConnectionSyncRuns(connectionId!),
    enabled: connectionId != null,
  })
}

export function useCreateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useUpdateConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ connectionId, data }: { connectionId: number; data: Parameters<typeof updateConnection>[1] }) =>
      updateConnection(connectionId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connection-sync-runs', variables.connectionId] })
    },
  })
}

export function useDeleteConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })
}

export function useTestConnection() {
  return useMutation({
    mutationFn: testConnection,
  })
}

export function useSyncConnection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: syncConnection,
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      queryClient.invalidateQueries({ queryKey: ['connection-sync-runs', connectionId] })
      queryClient.invalidateQueries({ queryKey: ['traces'] })
    },
  })
}
