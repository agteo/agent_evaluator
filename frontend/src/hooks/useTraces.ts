import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTraces, getTrace, importTraces, deleteTrace } from '../api/traces'

export function useTraces(params?: {
  search?: string
  tag?: string
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
