import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Retry once on connection refused (backend may still be starting when frontend loads)
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isConnectionRefused =
      err.code === 'ECONNREFUSED' ||
      err.message?.includes('ECONNREFUSED') ||
      err.message?.includes('Network Error')
    const retryCount = err.config?.__retryCount ?? 0
    if (isConnectionRefused && retryCount < 1) {
      await new Promise((r) => setTimeout(r, 1500))
      return client.request({ ...err.config, __retryCount: retryCount + 1 })
    }
    return Promise.reject(err)
  }
)

export default client
