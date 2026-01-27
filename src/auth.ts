// src/auth.ts
import { reactive } from 'vue'

type Role = 'admin' | 'user' | null

export const auth = reactive({
  configured: true as boolean, // will be loaded at startup
  token: localStorage.getItem('helm_token') || '',
  role: (localStorage.getItem('helm_role') as Role) || null,
  userName: localStorage.getItem('helm_userName') || '',
})

export function setSession(token: string, role: Role, userName = '') {
  auth.token = token
  auth.role = role
  auth.userName = userName

  localStorage.setItem('helm_token', token)
  if (role) localStorage.setItem('helm_role', role)
  else localStorage.removeItem('helm_role')

  if (userName) localStorage.setItem('helm_userName', userName)
  else localStorage.removeItem('helm_userName')
}

export function clearSession() {
  auth.token = ''
  auth.role = null
  auth.userName = ''
  localStorage.removeItem('helm_token')
  localStorage.removeItem('helm_role')
  localStorage.removeItem('helm_userName')
}
