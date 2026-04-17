import client from './client'
import type { TraceSummary, Trace, TraceImportResponse } from '../types'

interface TraceListResponse {
  items: TraceSummary[]
  total: number
  offset: number
  limit: number
}

export async function importTraces(file: File): Promise<TraceImportResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await client.post<TraceImportResponse>('/traces/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listTraces(params?: {
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
}): Promise<TraceListResponse> {
  const { data } = await client.get<TraceListResponse>('/traces', { params })
  return data
}

export async function getTrace(traceId: string): Promise<Trace> {
  const { data } = await client.get<Trace>(`/traces/${traceId}`)
  return data
}

export async function deleteTrace(traceId: string): Promise<void> {
  await client.delete(`/traces/${traceId}`)
}

export async function getTraceCount(): Promise<number> {
  const { data } = await client.get<{ count: number }>('/traces/count')
  return data.count
}
