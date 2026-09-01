import { ENV_TARGETS } from '@/constants/environments'

let activeBaseUrl = ENV_TARGETS.qa.baseUrl
let activeEnvKey = 'qa'

export function setApiBaseUrl(baseUrl) {
  activeBaseUrl = baseUrl
}

export function setApiEnvKey(key) {
  activeEnvKey = key
}

export function getApiBaseUrl() {
  return activeBaseUrl
}

export class ApiClientError extends Error {
  constructor(message, { status, code, requestId, data } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.requestId = requestId
    this.data = data
  }
}

async function request(path, options = {}) {
  const url = new URL(`${activeBaseUrl}${path}`)
  url.searchParams.set('env', activeEnvKey)
  const res = await fetch(url.toString(), options)
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    throw new ApiClientError(body?.error?.message || `Request failed (${res.status})`, {
      status: res.status,
      code: body?.error?.code,
      requestId: body?.error?.requestId,
      data: body?.data,
    })
  }

  return body
}

export const apiClient = {
  get(path) {
    return request(path)
  },
  post(path, body) {
    return request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  patch(path, body) {
    return request(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  put(path, body) {
    return request(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  },
  postForm(path, formData) {
    return request(path, { method: 'POST', body: formData })
  },
  delete(path, body) {
    return request(path, {
      method: 'DELETE',
      ...(body !== undefined && {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    })
  },
}
