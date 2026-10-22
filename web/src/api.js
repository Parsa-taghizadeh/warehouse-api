const TOKEN_KEY = 'warehouse_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore storage failures
  }
}

let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, options = {}, { skipAuthRedirect = false } = {}) {
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401 && !skipAuthRedirect) {
    clearToken()
    onUnauthorized?.()
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Request failed (${res.status})`)
  }

  return res.status === 204 ? null : res.json()
}

export function getAuthStatus() {
  return request('/auth/status', undefined, { skipAuthRedirect: true })
}

export function login(username, password) {
  return request(
    '/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    },
    { skipAuthRedirect: true }
  )
}

export function register(username, password) {
  return request(
    '/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    },
    { skipAuthRedirect: true }
  )
}

export function getMe() {
  return request('/auth/me', undefined, { skipAuthRedirect: true })
}

export function listProducts() {
  return request('/show/product')
}

export function createProduct(payload) {
  return request('/product', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateProduct(productCode, payload) {
  return request(`/products/${productCode}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteProduct(productCode) {
  return request(`/products/${productCode}`, { method: 'DELETE' })
}

export function stockIn(productCode, quantity, documentNumber) {
  return request(`/products/${productCode}/stock-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, document_number: documentNumber }),
  })
}

export function stockOut(productCode, quantity, documentNumber) {
  return request(`/products/${productCode}/stock-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity, document_number: documentNumber }),
  })
}

export function getTransactions(productCode) {
  return request(`/products/${productCode}/transactions`)
}

export function getMovementReport(filters) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value != null) params.set(key, value)
  }
  return request(`/reports/movements?${params}`)
}

export function listCategories() {
  return request('/categories')
}

export function createCategory(name) {
  return request('/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}

export function listUnits() {
  return request('/units')
}

export function createUnit(name) {
  return request('/unit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
}
