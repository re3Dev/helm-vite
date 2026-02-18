// src/auth.ts
import { reactive } from 'vue'

type Role = 'admin' | 'user' | null

export const auth = reactive({
  configured: true as boolean,
  token: localStorage.getItem('helm_token') || '',
  role: (localStorage.getItem('helm_role') as Role) || null,
  userName: localStorage.getItem('helm_userName') || '',

  // NEW — tells app whether we logged in via cookie-only session
  cookieMode: false as boolean,
})

export function setSession(token: string | null, role: Role, userName = '') {
  // token may be null if backend session is cookie-only
  auth.token = token || ''
  auth.role = role
  auth.userName = userName

  // cookieMode = true if backend didn’t give us a token
  auth.cookieMode = !token

  if (token) localStorage.setItem('helm_token', token)
  else localStorage.removeItem('helm_token')

  if (role) localStorage.setItem('helm_role', role)
  else localStorage.removeItem('helm_role')

  if (userName) localStorage.setItem('helm_userName', userName)
  else localStorage.removeItem('helm_userName')
}

export function clearSession() {
  auth.token = ''
  auth.role = null
  auth.userName = ''
  auth.cookieMode = false

  localStorage.removeItem('helm_token')
  localStorage.removeItem('helm_role')
  localStorage.removeItem('helm_userName')
}
