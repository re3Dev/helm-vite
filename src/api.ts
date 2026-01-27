// src/api.ts
import router from './router'
import { auth, clearSession } from './auth'

type FetchOptions = RequestInit & { json?: any }

export async function apiFetch<T = any>(url: string, opts: FetchOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers || {})

  // Attach token (header auth mode)
  if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`)

  // JSON body convenience
  let body = opts.body
  if (opts.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(opts.json)
  }

  const res = await fetch(url, { ...opts, headers, body })

  // Not configured (backend returns 409 with {error:"not_configured"})
  if (res.status === 409) {
    auth.configured = false
    clearSession()
    if (router.currentRoute.value.path !== '/setup') router.replace('/setup')
    throw new Error('not_configured')
  }

  // Unauthorized
  if (res.status === 401) {
    clearSession()
    if (router.currentRoute.value.path !== '/login') router.replace('/login')
    throw new Error('unauthorized')
  }

  // Other errors
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const j = await res.json()
      msg = j?.error || msg
    } catch {}
    throw new Error(msg)
  }

  // Some endpoints might return empty
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as unknown as T
}
