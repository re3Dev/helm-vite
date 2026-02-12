// src/router.ts
import { createRouter, createWebHistory } from 'vue-router'
import PrinterList from './components/PrinterList.vue'
import Analytics from './components/Analytics.vue'

// views
import LoginView from './views/LoginView.vue'
import SetupView from './views/SetupView.vue'
import AdminUsersView from './views/AdminUsersView.vue'

// auth store
import { auth } from './auth'

const routes = [
  { path: '/', redirect: '/printers' },

  // auth
  { path: '/setup', component: SetupView },
  { path: '/login', component: LoginView },

  // admin
  { path: '/admin/users', component: AdminUsersView },

  // app
  { path: '/printers', component: PrinterList },
  { path: '/analytics', component: Analytics },

  // catch-all (prevents “blank page” on unknown routes)
  { path: '/:pathMatch(.*)*', redirect: '/printers' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

async function refreshConfigured(): Promise<void> {
  try {
    const r = await fetch('/api/auth/status', { credentials: 'include' })
    if (r.ok) {
      const j = await r.json()
      auth.configured = !!j?.configured
    } else {
      // backend is reachable but erroring; fail open
      auth.configured = true
    }
  } catch {
    // backend down; fail open
    auth.configured = true
  }
}

/**
 * ✅ If "admin auto-login on this computer" is enabled, try to mint a fresh session.
 * This is what makes "stop backend -> start backend -> visit /printers" work.
 */
async function tryAutoLoginIfEnabled(): Promise<boolean> {
  try {
    const enabled = localStorage.getItem('helm_autologin_admin') === '1'
    if (!enabled) return false

    const r = await fetch('/api/auth/autologin', {
      method: 'POST',
      credentials: 'include',
    })
    if (!r.ok) return false

    const j = await r.json().catch(() => null)
    if (!j?.token) return false

    auth.token = String(j.token)
    auth.role = j.role
    auth.userName = j.user?.name || 'admin'
    return true
  } catch {
    return false
  }
}

router.beforeEach(async (to) => {
  // Re-check configured status in cases where it matters
  const shouldRefresh =
    to.path === '/setup' ||
    to.path === '/login' ||
    !auth.token ||
    auth.configured === false

  if (shouldRefresh) {
    await refreshConfigured()
  }

  // If not configured, force setup
  if (!auth.configured && to.path !== '/setup') {
    return '/setup'
  }

  // ✅ If configured but not logged in, try auto-login BEFORE forcing /login
  if (auth.configured && !auth.token && to.path !== '/login' && to.path !== '/setup') {
    const ok = await tryAutoLoginIfEnabled()
    if (!ok) return '/login'
    // if ok, continue to the route they requested
  }

  // If logged in and trying to visit setup/login, bounce to printers
  if (auth.token && (to.path === '/login' || to.path === '/setup')) {
    return '/printers'
  }

  return true
})

export default router
