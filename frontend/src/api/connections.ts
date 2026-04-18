import client from './client'
import type {
  Connection,
  ConnectionCreateInput,
  ConnectionSyncRun,
  ConnectionTestResult,
} from '../types'

export async function listConnections(): Promise<Connection[]> {
  const { data } = await client.get<Connection[]>('/connections')
  return data
}

export async function createConnection(body: ConnectionCreateInput): Promise<Connection> {
  const { data } = await client.post<Connection>('/connections', body)
  return data
}

export async function updateConnection(
  connectionId: number,
  body: ConnectionCreateInput,
): Promise<Connection> {
  const { data } = await client.patch<Connection>(`/connections/${connectionId}`, body)
  return data
}

export async function deleteConnection(connectionId: number): Promise<void> {
  await client.delete(`/connections/${connectionId}`)
}

export async function testConnection(connectionId: number): Promise<ConnectionTestResult> {
  const { data } = await client.post<ConnectionTestResult>(`/connections/${connectionId}/test`)
  return data
}

export async function syncConnection(connectionId: number): Promise<ConnectionSyncRun> {
  const { data } = await client.post<ConnectionSyncRun>(`/connections/${connectionId}/sync`)
  return data
}

export async function listConnectionSyncRuns(connectionId: number): Promise<ConnectionSyncRun[]> {
  const { data } = await client.get<ConnectionSyncRun[]>(`/connections/${connectionId}/sync-runs`)
  return data
}
