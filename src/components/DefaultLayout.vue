<template>
  <!-- DO NOT nest another v-app here -->
  <v-app-bar
    app
    dark
    class="app-toolbar"
    :elevation="0"
  >
    <!-- ✅ Brand group (logo + HELM + indicator) -->
    <div class="brand-group">
      <img class="brand-logo" src="/src/assets/re3D Logo White.png" alt="re3D" />
      <div class="title-group">
        <v-toolbar-title class="helm-title">HELM</v-toolbar-title>

        <!-- ✅ functional heartbeat w/ tooltip -->
        <span
          class="heartbeat"
          :class="heartbeatClass"
          :title="heartbeatTitle"
          aria-label="Backend status"
        ></span>
      </div>
    </div>

    <v-spacer />

    <!-- ✅ Hide app navigation on auth routes -->
    <template v-if="!isAuthRoute">
      <v-btn variant="text" to="/" class="nav-btn" :class="{ active: isActive('/') }">
        Dashboard
      </v-btn>
      <v-btn variant="text" to="/analytics" class="nav-btn" :class="{ active: isActive('/analytics') }">
        Analytics
      </v-btn>

      <!-- ✅ Account menu -->
      <v-menu location="bottom end" offset="8">
        <template #activator="{ props }">
          <v-btn v-bind="props" icon class="account-btn">
            <v-icon color="primary">mdi-account</v-icon>
          </v-btn>
        </template>

        <v-list density="compact" min-width="220">
          <v-list-item>
            <v-list-item-title class="text-subtitle-2">
              {{ auth.userName || 'User' }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ auth.role || 'unknown' }}
            </v-list-item-subtitle>
          </v-list-item>

          <v-divider />

          <v-list-item v-if="auth.role === 'admin'" @click="goUsers">
            <template #prepend>
              <v-icon>mdi-account-multiple</v-icon>
            </template>
            <v-list-item-title>User Management</v-list-item-title>
          </v-list-item>

          <v-list-item @click="logout">
            <template #prepend>
              <v-icon color="red">mdi-logout</v-icon>
            </template>
            <v-list-item-title>Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

  </v-app-bar>

  <v-main class="layout-main">
    <div class="layout-container" :class="{ 'auth-layout': isAuthRoute }">
      <!-- ✅ Left sidebar hidden on auth routes -->
      <div v-if="!isAuthRoute" class="sidebar-wrap">
        <MachineCommandSidebar :groups="commandGroups" />
      </div>

      <div class="main-content" :class="{ 'auth-main': isAuthRoute }">
        <router-view v-if="isAuthRoute" />
        <div v-else class="main-scroll">
          <router-view />
        </div>
      </div>

      <!-- ✅ Right utility sidebar hidden on auth routes -->
      <div v-if="!isAuthRoute" class="right-wrap">
        <RightBar
          :collapsed="rightCollapsed"
          :width="rightWidth"
          @toggle="toggleRight"
        />
      </div>
    </div>
  </v-main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

import MachineCommandSidebar from './MachineCommandSidebar.vue'
import RightBar from './RightBar.vue'
import { commandGroups } from './commandService.ts'

import router from '../router'
import { auth, clearSession } from '../auth'

const route = useRoute()

/** ✅ auth routes (no sidebars, no app nav) */
const isAuthRoute = computed(() => route.path === '/login' || route.path === '/setup')

const logout = () => {
  // Prevent immediate autologin bounce-back after logout
  try {
    sessionStorage.setItem('helm_autologin_suppress_once', '1')
  } catch {}

  clearSession()
  router.push('/login')
}


const goUsers = () => {
  router.push('/admin/users')
}

const isActive = (path: string) => {
  if (path === '/') return route.path === '/' || route.path === '/printers'
  return route.path.startsWith(path)
}

/** ---------------------------
 * ✅ Right bar state
 * --------------------------- */
const rightCollapsed = ref(localStorage.getItem('sidebarRightCollapsed') === 'true')
const rightWidth = ref(300)
const toggleRight = () => {
  rightCollapsed.value = !rightCollapsed.value
  localStorage.setItem('sidebarRightCollapsed', String(rightCollapsed.value))
}

/** ---------------------------
 * ✅ Backend heartbeat logic
 * --------------------------- */
type HeartbeatState = 'ok' | 'warn' | 'down'
const hbState = ref<HeartbeatState>('warn')
const hbRttMs = ref<number | null>(null)
const hbLastOkIso = ref<string | null>(null)
const hbMsg = ref<string>('Checking backend…')

let hbTimer: number | null = null

function withTimeout(ms: number) {
  const controller = new AbortController()
  const id = window.setTimeout(() => controller.abort(), ms)
  return { controller, clear: () => window.clearTimeout(id) }
}

async function pollHealthOnce() {
  const t0 = performance.now()
  const { controller, clear } = withTimeout(1500)

  try {
    // same-origin call; in dev ensure Vite proxy routes /api to Flask
    const res = await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })

    const rtt = Math.max(0, Math.round(performance.now() - t0))
    hbRttMs.value = rtt

    if (!res.ok) {
      hbState.value = 'warn'
      hbMsg.value = `Health returned HTTP ${res.status}`
      return
    }

    const j = await res.json().catch(() => null)
    hbLastOkIso.value = new Date().toISOString()

    const hasErr = !!j?.snapshot?.last_error
    if (hasErr) {
      hbState.value = 'warn'
      hbMsg.value = `Backend OK (reported error)`
    } else if (rtt >= 700) {
      hbState.value = 'warn'
      hbMsg.value = `Backend slow`
    } else {
      hbState.value = 'ok'
      hbMsg.value = `Backend OK`
    }
  } catch (e: any) {
    hbState.value = 'down'
    hbRttMs.value = null
    hbMsg.value = 'Backend unreachable'
  } finally {
    clear()
  }
}

const heartbeatClass = computed(() => {
  return {
    ok: hbState.value === 'ok',
    warn: hbState.value === 'warn',
    down: hbState.value === 'down',
  }
})

const heartbeatTitle = computed(() => {
  const rtt = hbRttMs.value != null ? `${hbRttMs.value}ms` : '—'
  const last = hbLastOkIso.value ? new Date(hbLastOkIso.value).toLocaleTimeString() : '—'
  return `${hbMsg.value}\nRTT: ${rtt}\nLast OK: ${last}`
})

onMounted(() => {
  // heartbeat polling (keep it even on login)
  pollHealthOnce()
  hbTimer = window.setInterval(pollHealthOnce, 2500)
})

onBeforeUnmount(() => {
  if (hbTimer) window.clearInterval(hbTimer)
  hbTimer = null
})
</script>

<style scoped>
/* =========================
   Toolbar
   ========================= */

.app-toolbar{
  position: relative;
  overflow: hidden;
  background: var(--helm-nav);
  border-bottom: 1px solid var(--helm-border);
  box-shadow: none;
}

/* =========================
   Brand cluster
   ========================= */

.brand-group{
  display: flex;
  align-items: center;
  gap: 12px;
  padding-left: 20px;
}

.brand-logo{
  width: auto;
  height: 34px;
  display: block;
}

.title-group{
  display: flex;
  align-items: center;
  gap: 6px;
}

.helm-title{
  letter-spacing: 0.08em;
  font-weight: 600;
  color: var(--helm-fg);
}

/* functional heartbeat */
.heartbeat{
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

.heartbeat.ok{
  background: rgb(var(--v-theme-success));
}

.heartbeat.warn{
  background: rgb(var(--v-theme-warning));
}

.heartbeat.down{
  background: rgb(var(--v-theme-error));
}

/* Nav buttons */
.nav-btn{
  color: var(--helm-muted);
  font-weight: 600;
  text-transform: none;
  margin-right: 8px;
  position: relative;
  border-radius: var(--helm-radius-sm);
  padding: 6px 10px;
  transition: background-color 140ms ease, color 140ms ease;
}
.nav-btn:hover{
  background: var(--helm-raised);
  color: var(--helm-fg);
}
.nav-btn.active{
  color: var(--helm-fg);
  background: var(--helm-raised);
  box-shadow: inset 0 -2px 0 var(--helm-brand);
}

.account-btn{
  border-radius: var(--helm-radius-sm);
  transition: background-color 140ms ease;
}
.account-btn:hover{
  background: var(--helm-raised);
}

/* =========================
   Layout
   ========================= */

.layout-container{
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.sidebar-wrap{
  position: relative;
  z-index: 1;
  display: block; /* wrapper is for measuring width */
  flex: 0 0 auto;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.right-wrap{
  position: relative;
  z-index: 1;
  display: block; /* wrapper is for measuring width */
  flex: 0 0 auto;
  height: 100%;
  min-height: 0;
  overflow: visible;
}

.main-content{
  flex: 1 1 auto;
  min-width: 0;  /* ✅ important: allows flex shrink with side rails */
  min-height: 0;
  overflow: hidden;
  display: flex;
  justify-content: flex-start;
  align-items: stretch;
  height: 100%;
}

.main-scroll{
  flex: 1;
  max-width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  display: block;
}

.main-scroll > *{
  width: 100%;
  max-width: 100%;
  margin: 0;
}

.layout-main{
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.layout-main :deep(.v-main__scroller){
  overflow: hidden !important;
}

/* ✅ auth routes: remove padding and let login center nicely */
.auth-layout{
  height: 100%;
}

.auth-main{
  padding: 0;
  align-items: center;   /* centers router-view container vertically if it uses flex */
  justify-content: center;
}
</style>
