import client from './client'
import type { Dataset } from '../types'

interface DatasetListResponse {
  items: Dataset[]
  total: number
  offset: number
  limit: number
}

export async function listDatasets(params?: {
  offset?: number
  limit?: number
}): Promise<DatasetListResponse> {
  const { data } = await client.get<DatasetListResponse>('/datasets', { params })
  return data
}

export async function getDataset(datasetId: number): Promise<Dataset> {
  const { data } = await client.get<Dataset>(`/datasets/${datasetId}`)
  return data
}

export async function createDataset(body: {
  name: string
  description?: string
}): Promise<Dataset> {
  const { data } = await client.post<Dataset>('/datasets', body)
  return data
}

export async function updateDataset(
  datasetId: number,
  body: { name?: string; description?: string },
): Promise<Dataset> {
  const { data } = await client.put<Dataset>(`/datasets/${datasetId}`, body)
  return data
}

export async function deleteDataset(datasetId: number): Promise<void> {
  await client.delete(`/datasets/${datasetId}`)
}

export async function getDatasetTraces(
  datasetId: number,
): Promise<string[]> {
  const { data } = await client.get<{ trace_ids: string[] }>(
    `/datasets/${datasetId}/traces`,
  )
  return data.trace_ids
}

export async function addTracesToDataset(
  datasetId: number,
  traceIds: string[],
): Promise<{ added: number; skipped: number }> {
  const { data } = await client.post(`/datasets/${datasetId}/add-traces`, {
    trace_ids: traceIds,
  })
  return data
}

export async function removeTracesFromDataset(
  datasetId: number,
  traceIds: string[],
): Promise<{ removed: number }> {
  const { data } = await client.post(`/datasets/${datasetId}/remove-traces`, {
    trace_ids: traceIds,
  })
  return data
}
