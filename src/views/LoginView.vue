<template>
  <v-container class="py-8" style="max-width:520px">
    <v-card>
      <v-tabs v-model="tab" grow>
        <v-tab value="pin">PIN</v-tab>
        <v-tab value="admin">Admin</v-tab>
      </v-tabs>

      <v-card-text>
        <div v-if="tab==='pin'">
          <v-text-field
            v-model="pin"
            label="PIN"
            inputmode="numeric"
            autocomplete="one-time-code"
          />
        </div>

        <div v-else>
          <v-text-field v-model="username" label="Username" autocomplete="username" />
          <v-text-field v-model="password" label="Password" type="password" autocomplete="current-password" />

          <v-checkbox
            v-model="autoLoginEnabled"
            class="mt-2"
            density="compact"
            hide-details
            label="Auto-login on this computer (admin)"
            @update:modelValue="persistAutoLogin"
          />
        </div>



        <v-alert v-if="err" type="error" variant="tonal" class="mt-3">{{ err }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn :loading="loading" color="primary" @click="login">Login</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import router from '../router'
import { apiFetch } from '../api'
import { setSession } from '../auth'

const tab = ref<'pin'|'admin'>('pin')
const pin = ref('')
const username = ref('admin')
const password = ref('')
const loading = ref(false)
const err = ref('')

const AUTOLOGIN_KEY = 'helm_autologin_admin'
const autoLoginEnabled = ref(false)

function persistAutoLogin() {
  try {
    localStorage.setItem(AUTOLOGIN_KEY, autoLoginEnabled.value ? '1' : '0')
  } catch {}
}

function loadAutoLogin() {
  try {
    autoLoginEnabled.value = localStorage.getItem(AUTOLOGIN_KEY) === '1'
  } catch {
    autoLoginEnabled.value = false
  }
}

async function attemptAutoLogin() {
  if (shouldSuppressAutoLoginOnce()) return false
  // Only attempt when enabled
  if (!autoLoginEnabled.value) return false

  try {
    const r = await apiFetch<{ ok: boolean; token: string; role: 'admin'|'user'; user: { name: string } }>(
      '/api/auth/autologin',
      { method: 'POST' }
    )

    setSession(r.token, r.role, r.user?.name || '')
    router.replace('/')
    return true
  } catch {
    return false
  }
}

onMounted(async () => {
  loadAutoLogin()
  // Try autologin immediately; if it fails, user can login normally.
  await attemptAutoLogin()
})

async function login() {
  err.value = ''
  loading.value = true
  try {
    const payload =
      tab.value === 'pin'
        ? { mode: 'pin', pin: pin.value }
        : { mode: 'admin', username: username.value, password: password.value }

    const r = await apiFetch<{ ok: boolean; token: string; role: 'admin'|'user'; user: { name: string } }>(
      '/api/auth/login',
      { method: 'POST', json: payload }
    )

    // If they successfully admin-login and checkbox is on, persist it
    if (tab.value === 'admin') persistAutoLogin()

    setSession(r.token, r.role, r.user?.name || '')
    router.replace('/')
  } catch (e: any) {
    err.value = e?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}


function shouldSuppressAutoLoginOnce(): boolean {
  try {
    const v = sessionStorage.getItem('helm_autologin_suppress_once') === '1'
    if (v) sessionStorage.removeItem('helm_autologin_suppress_once')
    return v
  } catch {
    return false
  }
}


</script>
