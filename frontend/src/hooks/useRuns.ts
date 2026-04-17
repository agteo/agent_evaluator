import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createRun,
  listRuns,
  getRun,
  getRunResults,
  deleteRun,
  getRunAggregation,
  compareRuns,
} from '../api/runs'

export function useRuns(params?: {
  eval_config_id?: number
  search?: string
  status?: string
  source_label?: string
  offset?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['runs', params],
    queryFn: () => listRuns(params),
  })
}

export function useRun(runId: number | undefined) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
  })
}

export function useRunPolling(runId: number | undefined) {
  return useQuery({
    queryKey: ['run', runId],
    queryFn: () => getRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) => {
      const run = query.state.data
      if (run && (run.status === 'pending' || run.status === 'running')) {
        return 2000
      }
      return false
    },
  })
}

export function useRunResults(
  runId: number | undefined,
  params?: { offset?: number; limit?: number },
) {
  return useQuery({
    queryKey: ['runResults', runId, params],
    queryFn: () => getRunResults(runId!, params),
    enabled: !!runId,
  })
}

export function useRunAggregation(runId: number | undefined) {
  return useQuery({
    queryKey: ['runAggregation', runId],
    queryFn: () => getRunAggregation(runId!),
    enabled: !!runId,
  })
}

export function useCreateRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] })
    },
  })
}

export function useCompareRuns() {
  return useMutation({
    mutationFn: compareRuns,
  })
}

export function useDeleteRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['runs'] })
    },
  })
}
