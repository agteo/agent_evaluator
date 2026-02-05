import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listDatasets,
  getDataset,
  createDataset,
  updateDataset,
  deleteDataset,
  getDatasetTraces,
  addTracesToDataset,
  removeTracesFromDataset,
} from '../api/datasets'

export function useDatasets(params?: { offset?: number; limit?: number }) {
  return useQuery({
    queryKey: ['datasets', params],
    queryFn: () => listDatasets(params),
  })
}

export function useDataset(datasetId: number | undefined) {
  return useQuery({
    queryKey: ['dataset', datasetId],
    queryFn: () => getDataset(datasetId!),
    enabled: !!datasetId,
  })
}

export function useDatasetTraces(datasetId: number | undefined) {
  return useQuery({
    queryKey: ['datasetTraces', datasetId],
    queryFn: () => getDatasetTraces(datasetId!),
    enabled: !!datasetId,
  })
}

export function useCreateDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useUpdateDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, data }: { datasetId: number; data: { name?: string; description?: string } }) =>
      updateDataset(datasetId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      queryClient.invalidateQueries({ queryKey: ['dataset'] })
    },
  })
}

export function useDeleteDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDataset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useAddTracesToDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, traceIds }: { datasetId: number; traceIds: string[] }) =>
      addTracesToDataset(datasetId, traceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      queryClient.invalidateQueries({ queryKey: ['dataset'] })
      queryClient.invalidateQueries({ queryKey: ['datasetTraces'] })
    },
  })
}

export function useRemoveTracesFromDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ datasetId, traceIds }: { datasetId: number; traceIds: string[] }) =>
      removeTracesFromDataset(datasetId, traceIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
      queryClient.invalidateQueries({ queryKey: ['dataset'] })
      queryClient.invalidateQueries({ queryKey: ['datasetTraces'] })
    },
  })
}
