import client from './client'
import type { EvalRun, EvalResult, RunComparison } from '../types'

interface RunListResponse {
  items: EvalRun[]
  total: number
  offset: number
  limit: number
}

interface RunResultsResponse {
  items: EvalResult[]
  total: number
  offset: number
  limit: number
}

export async function createRun(body: {
  eval_config_id: number
  trace_ids?: string[]
  dataset_id?: number
  name?: string
  description?: string
  owner?: string
  tags?: string[]
  source_label?: string
  prompt_version?: string
  commit_sha?: string
  baseline_run_id?: number
}): Promise<EvalRun> {
  const { data } = await client.post<EvalRun>('/runs', body)
  return data
}

export async function listRuns(params?: {
  eval_config_id?: number
  search?: string
  status?: string
  source_label?: string
  offset?: number
  limit?: number
}): Promise<RunListResponse> {
  const { data } = await client.get<RunListResponse>('/runs', { params })
  return data
}

export async function getRun(runId: number): Promise<EvalRun> {
  const { data } = await client.get<EvalRun>(`/runs/${runId}`)
  return data
}

export async function getRunResults(
  runId: number,
  params?: { offset?: number; limit?: number },
): Promise<RunResultsResponse> {
  const { data } = await client.get<RunResultsResponse>(`/runs/${runId}/results`, {
    params,
  })
  return data
}

export async function deleteRun(runId: number): Promise<void> {
  await client.delete(`/runs/${runId}`)
}

export async function getRunAggregation(
  runId: number,
): Promise<Record<string, unknown>> {
  const { data } = await client.get(`/runs/${runId}/aggregation`)
  return data
}

export async function exportRunResults(
  runId: number,
  format: 'json' | 'csv',
): Promise<Blob> {
  const { data } = await client.get(`/runs/${runId}/export`, {
    params: { format },
    responseType: 'blob',
  })
  return data
}

export async function compareRuns(
  runIds: number[],
): Promise<RunComparison> {
  const { data } = await client.post<RunComparison>('/runs/compare', { run_ids: runIds })
  return data
}
