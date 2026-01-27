<template>
  <v-container class="py-8" style="max-width:520px">
    <v-card>
      <v-card-title>First-time Setup</v-card-title>
      <v-card-subtitle>Create the admin login</v-card-subtitle>

      <v-card-text>
        <v-text-field v-model="username" label="Admin username" autocomplete="username" />
        <v-text-field v-model="password" label="Admin password" type="password" autocomplete="new-password" />
        <v-alert v-if="err" type="error" variant="tonal" class="mt-3">{{ err }}</v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn :loading="loading" color="primary" @click="setup">Create Admin</v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import router from '../router'
import { apiFetch } from '../api'
import { auth, setSession } from '../auth'

const username = ref('admin')
const password = ref('')
const loading = ref(false)
const err = ref('')

async function setup() {
  err.value = ''
  loading.value = true
  try {
    const r = await apiFetch<{ ok: boolean; token: string; role: 'admin' }>('/api/auth/setup', {
      method: 'POST',
      json: { username: username.value, password: password.value },
    })
    auth.configured = true
    setSession(r.token, r.role, username.value)
    router.replace('/')
  } catch (e: any) {
    err.value = e?.message || 'Setup failed'
  } finally {
    loading.value = false
  }
}
</script>
