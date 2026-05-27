const BASE_URL = 'http://localhost:8000/api/v1'

function getToken() { return localStorage.getItem('ecoproof_token') }

async function handle(res) {
  const ct = res.headers.get('content-type') || ''
  const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text()
  if (!res.ok) {
    const detail = (data && data.detail) || res.statusText || 'Erro de rede'
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail))
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

function authHeaders(extra = {}) {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}`, ...extra } : { ...extra }
}

export const api = {
  get: (path) => fetch(`${BASE_URL}${path}`, { headers: authHeaders() }).then(handle),
  post: (path, body) => fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle),
  patch: (path, body) => fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: body ? JSON.stringify(body) : undefined,
  }).then(handle),
  del: (path) => fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: authHeaders() }).then(handle),
}

export function apiFormData(path, formData, method = 'POST') {
  // NÃO definir Content-Type: o browser injeta o boundary correto
  return fetch(`${BASE_URL}${path}`, { method, headers: authHeaders(), body: formData }).then(handle)
}
