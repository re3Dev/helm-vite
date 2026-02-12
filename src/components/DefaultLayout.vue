<template>
  <!-- DO NOT nest another v-app here -->
  <v-app-bar
    app
    dark
    class="animated-toolbar"
    :style="{ '--content-center-x': contentCenterPx + 'px' }"
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

    <!-- ✅ Bottom rail aligned to main-content center -->
    <div class="toolbar-rail" aria-hidden="true"></div>
  </v-app-bar>

  <v-main>
    <div class="layout-container" :class="{ 'auth-layout': isAuthRoute }">
      <!-- ✅ Left sidebar hidden on auth routes -->
      <div v-if="!isAuthRoute" ref="sidebarWrap" class="sidebar-wrap">
        <MachineCommandSidebar :groups="commandGroups" />
      </div>

      <div class="main-content" :class="{ 'auth-main': isAuthRoute }">
        <router-view />
      </div>

      <!-- ✅ Right utility sidebar hidden on auth routes -->
      <div v-if="!isAuthRoute" ref="rightWrap" class="right-wrap">
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

/** ---------------------------
 * ✅ Right bar state
 * --------------------------- */
const rightCollapsed = ref(false)
const rightWidth = ref(300)
const toggleRight = () => (rightCollapsed.value = !rightCollapsed.value)

/** ---------------------------
 * ✅ Main-content-center alignment logic (NOW accounts for left + right)
 * --------------------------- */
const sidebarWrap = ref<HTMLElement | null>(null)
const rightWrap = ref<HTMLElement | null>(null)

const leftWidthPx = ref(0)
const rightWidthPxMeasured = ref(0)
const contentCenterPx = ref(0)

let roLeft: ResizeObserver | null = null
let roRight: ResizeObserver | null = null

function computeContentCenter() {
  const vw = window.innerWidth || 0

  // If auth route, there are no sidebars, so center is the viewport center
  if (isAuthRoute.value) {
    contentCenterPx.value = vw / 2
    return
  }

  const lw = leftWidthPx.value || 0
  const rw = rightWidthPxMeasured.value || 0

  // main content region is [lw .. (vw - rw)]
  // center is lw + (vw - rw - lw)/2
  const mainW = Math.max(0, vw - lw - rw)
  contentCenterPx.value = lw + mainW / 2
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

function startSidebarObservers() {
  // measure left sidebar width continuously
  if (sidebarWrap.value && !roLeft) {
    roLeft = new ResizeObserver(entries => {
      const entry = entries[0]
      leftWidthPx.value = entry?.contentRect?.width ?? 0
      computeContentCenter()
    })
    roLeft.observe(sidebarWrap.value)
  }

  // measure right rail width continuously (0 when collapsed)
  if (rightWrap.value && !roRight) {
    roRight = new ResizeObserver(entries => {
      const entry = entries[0]
      rightWidthPxMeasured.value = entry?.contentRect?.width ?? 0
      computeContentCenter()
    })
    roRight.observe(rightWrap.value)
  }
}

function stopSidebarObservers() {
  if (roLeft && sidebarWrap.value) roLeft.unobserve(sidebarWrap.value)
  roLeft = null
  leftWidthPx.value = 0

  if (roRight && rightWrap.value) roRight.unobserve(rightWrap.value)
  roRight = null
  rightWidthPxMeasured.value = 0
}

onMounted(() => {
  window.addEventListener('resize', computeContentCenter)

  // heartbeat polling (keep it even on login)
  pollHealthOnce()
  hbTimer = window.setInterval(pollHealthOnce, 2500)

  // initial observers depending on route
  if (!isAuthRoute.value) startSidebarObservers()
  computeContentCenter()
})

watch(isAuthRoute, (authRouteNow) => {
  // Toggle observers cleanly when moving between login/setup and app pages
  if (authRouteNow) {
    stopSidebarObservers()
  } else {
    startSidebarObservers()
  }
  computeContentCenter()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', computeContentCenter)
  stopSidebarObservers()

  if (hbTimer) window.clearInterval(hbTimer)
  hbTimer = null
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');
* { font-family: 'Lato', sans-serif !important; }

/* =========================
   Toolbar
   ========================= */

.animated-toolbar{
  position: relative;
  overflow: hidden;

  background: linear-gradient(270deg, #000000, #161616, #242424, #161616, #000000);
  background-size: 1000% 100%;
  animation: gradientFlow 30s ease infinite;

  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 -1px 0 rgba(0,0,0,0.35) inset,
    0 10px 24px rgba(0,0,0,0.28);

  --content-center-x: 50vw; /* default if JS hasn't run yet */
}

@keyframes gradientFlow{
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
}

/* subtle sheen sweep */
.animated-toolbar::before{
  content:"";
  position:absolute;
  top:-40%;
  left:-60%;
  width: 160%;
  height: 200%;
  pointer-events:none;

  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.04) 42%,
    rgba(255,213,74,0.14) 50%,
    rgba(255,255,255,0.04) 58%,
    transparent 100%
  );

  transform: rotate(8deg);
  mix-blend-mode: screen;
  opacity: 0.55;
  animation: toolbarSweep 9s ease-in-out infinite;
}

/* scanline texture */
.animated-toolbar::after{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity: 0.22;
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255,255,255,0.04) 0px,
      rgba(255,255,255,0.04) 1px,
      transparent 1px,
      transparent 6px
    );
}

@keyframes toolbarSweep{
  0%   { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
  35%  { transform: translateX(0%)   rotate(8deg); opacity: 0.60; }
  70%  { transform: translateX(18%)  rotate(8deg); opacity: 0.35; }
  100% { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce){
  .animated-toolbar{ animation: none !important; }
  .animated-toolbar::before{ animation: none !important; }
}

/* =========================
   Brand cluster
   ========================= */

.brand-group{
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 10px;
}

.brand-logo{
  width: 40.9px;
  height: 47.5px;
  display: block;
}

.title-group{
  display: flex;
  align-items: center;
  gap: 6px;
}

.helm-title{
  letter-spacing: 0.08em;
  font-weight: 800;
  opacity: 0.95;
}

/* functional heartbeat */
.heartbeat{
  width: 9px;
  height: 9px;
  border-radius: 999px;
  display: inline-block;
}

/* OK = green + ping */
.heartbeat.ok{
  background: #7CFFB2;
  box-shadow:
    0 0 0 0 rgba(124,255,178,0.55),
    0 0 18px rgba(124,255,178,0.22);
  animation: ping 1.6s ease-out infinite;
}

/* WARN = yellow + slower ping */
.heartbeat.warn{
  background: #FFD54A;
  box-shadow:
    0 0 0 0 rgba(255,213,74,0.55),
    0 0 18px rgba(255,213,74,0.22);
  animation: ping 2.2s ease-out infinite;
}

/* DOWN = red + no ping (solid) */
.heartbeat.down{
  background: #FF6B6B;
  box-shadow:
    0 0 10px rgba(255,107,107,0.25);
  animation: none;
}

@keyframes ping{
  0%   { transform: scale(0.92); opacity: 1; }
  65%  { transform: scale(1.0);  opacity: 1; }
  100% { transform: scale(0.92); opacity: 0.95; }
}

@media (prefers-reduced-motion: reduce){
  .heartbeat.ok,
  .heartbeat.warn{ animation: none !important; }
}

/* Bottom rail aligned to main-content center */
.toolbar-rail{
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  pointer-events: none;

  background:
    radial-gradient(
      circle at var(--content-center-x) 50%,
      rgba(255,213,74,0.95) 0%,
      rgba(255,213,74,0.65) 14%,
      rgba(255,213,74,0.18) 32%,
      rgba(255,213,74,0.00) 55%
    );
  opacity: 0.95;
}

/* Nav buttons */
.nav-btn{
  color: rgba(255,255,255,0.92);
  font-weight: 700;
  text-transform: none;
  margin-right: 8px;
  position: relative;
  border-radius: 10px;
  padding: 6px 10px;
  transition: transform 140ms ease, background-color 140ms ease, color 140ms ease;
}
.nav-btn:hover{
  background: rgba(255,255,255,0.06);
  transform: translateY(-1px);
}
.nav-btn.active{
  color: #fff;
  background: rgba(255,255,255,0.05);
}

.account-btn{
  border-radius: 12px;
  transition: background-color 140ms ease;
}
.account-btn:hover{
  background: rgba(255,255,255,0.06);
}

/* =========================
   Layout
   ========================= */

.layout-container{
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar-wrap{
  display: block; /* wrapper is for measuring width */
}

.right-wrap{
  display: block; /* wrapper is for measuring width */
  height: 100%;
}

.main-content{
  flex: 1;
  min-width: 0;  /* ✅ important: allows flex shrink with side rails */
  overflow: auto;
  padding: 16px;
  display: flex;
  height: 100%;
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
