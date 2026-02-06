import client from './client'
import type { EvalConfig, EvalConfigCreate } from '../types'

interface EvalConfigListResponse {
  items: EvalConfig[]
  total: number
  offset: number
  limit: number
}

export async function listEvalConfigs(params?: {
  offset?: number
  limit?: number
}): Promise<EvalConfigListResponse> {
  const { data } = await client.get<EvalConfigListResponse>('/evals', { params })
  return data
}

export async function getEvalConfig(configId: number): Promise<EvalConfig> {
  const { data } = await client.get<EvalConfig>(`/evals/${configId}`)
  return data
}

export async function createEvalConfig(body: EvalConfigCreate): Promise<EvalConfig> {
  const { data } = await client.post<EvalConfig>('/evals', body)
  return data
}

export async function updateEvalConfig(
  configId: number,
  body: Partial<EvalConfigCreate>,
): Promise<EvalConfig> {
  const { data } = await client.put<EvalConfig>(`/evals/${configId}`, body)
  return data
}

export async function deleteEvalConfig(configId: number): Promise<void> {
  await client.delete(`/evals/${configId}`)
}

export interface TestTraceResult {
  trace_id: string
  overall_score: number | null
  criteria_scores: Record<string, { score: number; reasoning?: string }> | null
  reasoning: string | null
  raw_response: string
  prompt_used: string
  tokens_used: number
  latency_ms: number
}

export async function testSingleTrace(
  configId: number,
  traceId: string,
): Promise<TestTraceResult> {
  const { data } = await client.post<TestTraceResult>(`/evals/${configId}/test`, {
    trace_id: traceId,
  })
  return data
}
