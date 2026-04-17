import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTraces, getTrace, importTraces, deleteTrace } from '../api/traces'

export function useTraces(params?: {
  search?: string
  tag?: string
  user_id?: string
  session_id?: string
  version?: string
  release?: string
  has_scores?: boolean
  min_latency_ms?: number
  max_latency_ms?: number
  min_cost?: number
  max_cost?: number
  sort_by?: string
  sort_dir?: string
  offset?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['traces', params],
    queryFn: () => listTraces(params),
  })
}

export function useTrace(traceId: string | undefined) {
  return useQuery({
    queryKey: ['trace', traceId],
    queryFn: () => getTrace(traceId!),
    enabled: !!traceId,
  })
}

export function useImportTraces() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importTraces,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traces'] })
    },
  })
}

export function useDeleteTrace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTrace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traces'] })
    },
  })
}
