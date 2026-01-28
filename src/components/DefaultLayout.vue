<template>
  <!-- DO NOT nest another v-app here -->
  <v-app-bar
    app
    dark
    class="animated-toolbar"
    :style="{
      '--content-center-x': contentCenterPx + 'px'
    }"
  >
    &ensp;&ensp;
    <img src="/src/assets/re3D Logo White.png" width="40.9px" height="47.5px" />
    <v-toolbar-title class="helm-title">HELM</v-toolbar-title>

    <v-spacer />

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

    <!-- ✅ Bottom rail aligned to main-content center -->
    <div class="toolbar-rail" aria-hidden="true"></div>
  </v-app-bar>

  <v-main>
    <div class="layout-container">
      <!-- ✅ Wrap sidebar so we can measure actual width -->
      <div ref="sidebarWrap" class="sidebar-wrap">
        <MachineCommandSidebar :groups="commandGroups" />
      </div>

      <div class="main-content">
        <router-view />
      </div>
    </div>
  </v-main>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'

import MachineCommandSidebar from './MachineCommandSidebar.vue'
import { commandGroups } from './commandService.ts'

import router from '../router'
import { auth, clearSession } from '../auth'

const route = useRoute()

const logout = () => {
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

/** --- ✅ Main-content-center alignment logic --- */
const sidebarWrap = ref<HTMLElement | null>(null)
const sidebarWidthPx = ref(0)
const contentCenterPx = ref(0)

let ro: ResizeObserver | null = null

function computeContentCenter() {
  // viewport width (app bar spans the viewport)
  const vw = window.innerWidth || 0
  const sw = sidebarWidthPx.value || 0

  // main content region = [sw .. vw]
  // center = sw + (vw - sw)/2
  contentCenterPx.value = sw + (vw - sw) / 2
}

onMounted(() => {
  // measure sidebar width continuously (resizer drag, collapse, etc.)
  if (sidebarWrap.value) {
    ro = new ResizeObserver(entries => {
      const entry = entries[0]
      const next = entry?.contentRect?.width ?? 0
      sidebarWidthPx.value = next
      computeContentCenter()
    })
    ro.observe(sidebarWrap.value)
  }

  window.addEventListener('resize', computeContentCenter)
  computeContentCenter()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', computeContentCenter)
  if (ro && sidebarWrap.value) ro.unobserve(sidebarWrap.value)
  ro = null
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

  /* default value if JS hasn’t run yet */
  --content-center-x: 50vw;
}

@keyframes gradientFlow{
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
}

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

.animated-toolbar::after{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity: 0.25;
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

.helm-title{
  letter-spacing: 0.08em;
  font-weight: 800;
  opacity: 0.95;
}

/* ✅ rail whose "bright center" tracks the main content center */
.toolbar-rail{
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  pointer-events: none;

  /* the center point follows --content-center-x */
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

/* Layout */
.layout-container{
  display: flex;
  width: 100%;
  height: 100%;
}

.sidebar-wrap{
  /* no styling needed; wrapper is for measuring width */
  display: block;
}

.main-content{
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  height: 100%;
}
</style>
