import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listEvalConfigs,
  getEvalConfig,
  createEvalConfig,
  updateEvalConfig,
  deleteEvalConfig,
} from '../api/evals'
import type { EvalConfigCreate } from '../types'

export function useEvalConfigs(params?: { offset?: number; limit?: number }) {
  return useQuery({
    queryKey: ['evalConfigs', params],
    queryFn: () => listEvalConfigs(params),
  })
}

export function useEvalConfig(configId: number | undefined) {
  return useQuery({
    queryKey: ['evalConfig', configId],
    queryFn: () => getEvalConfig(configId!),
    enabled: !!configId,
  })
}

export function useCreateEvalConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: EvalConfigCreate) => createEvalConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evalConfigs'] })
    },
  })
}

export function useUpdateEvalConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ configId, data }: { configId: number; data: Partial<EvalConfigCreate> }) =>
      updateEvalConfig(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evalConfigs'] })
      queryClient.invalidateQueries({ queryKey: ['evalConfig'] })
    },
  })
}

export function useDeleteEvalConfig() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteEvalConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evalConfigs'] })
    },
  })
}
