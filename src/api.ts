// src/api.ts
import router from './router'
import { auth, clearSession } from './auth'

type FetchOptions = RequestInit & { json?: any }

// Optional: in dev you might proxy /api to Flask, so leaving base as '' is fine.
// If you ever need a full URL, you can set VITE_API_BASE in .env
const API_BASE = (import.meta as any)?.env?.VITE_API_BASE ?? ''

export async function apiFetch<T = any>(path: string, opts: FetchOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers || {})

  // Attach token if present (header auth mode)
  if (auth.token) headers.set('Authorization', `Bearer ${auth.token}`)

  // JSON body convenience
  let body = opts.body
  if (opts.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(opts.json)
  }

  // Build URL safely
  const url =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`

  const res = await fetch(url, {
    ...opts,
    headers,
    body,

    // IMPORTANT: allow cookie-based sessions (helm_session)
    // Works even if you're also using Authorization header.
    credentials: 'include',
  })

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
      msg = j?.error || j?.message || msg
    } catch {}
    throw new Error(msg)
  }

  // Empty responses
  if (res.status === 204) return undefined as unknown as T

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as unknown as T
}
