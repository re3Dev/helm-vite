<template>
  <v-container fluid>
    <div class="d-flex align-center justify-space-between mb-4">
      <div>
        <h2 class="text-h5">{{ $t('admin.title') }}</h2>
        <div class="text-body-2 text-medium-emphasis">
          {{ $t('admin.subtitle') }}
        </div>
      </div>

      <v-btn variant="tonal" @click="refreshAll" :loading="loading">
        <v-icon start>mdi-refresh</v-icon>
        {{ $t('common.refresh') }}
      </v-btn>
    </div>

    <!-- CREATE USER -->
    <v-card class="mb-4" color="surface" variant="elevated">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2" color="primary">mdi-account-plus</v-icon>
        {{ $t('admin.addUser') }}
      </v-card-title>

      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="5">
            <v-text-field
              v-model="newName"
              :label="$t('admin.nameLabel')"
              :placeholder="$t('admin.namePlaceholder')"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-text-field
              v-model="newPin"
              :label="$t('auth.pinLabel')"
              placeholder="1234"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </v-col>

          <v-col cols="12" md="4" class="d-flex align-center">
            <v-btn
              color="primary"
              :disabled="!canCreate"
              :loading="creating"
              @click="createUser"
            >
              <v-icon start>mdi-account-plus</v-icon>
              {{ $t('admin.createUser') }}
            </v-btn>

            <div class="ml-3 text-caption text-medium-emphasis">
              {{ $t('admin.pinHint') }}
            </div>
          </v-col>
        </v-row>

        <v-alert
          v-if="createError"
          class="mt-3"
          type="error"
          variant="tonal"
          density="comfortable"
        >
          {{ createError }}
        </v-alert>

        <v-alert
          v-if="createOk"
          class="mt-3"
          type="success"
          variant="tonal"
          density="comfortable"
        >
          {{ createOk }}
        </v-alert>
      </v-card-text>
    </v-card>

    <v-row dense>
      <!-- USERS LIST -->
      <v-col cols="12" md="5">
        <v-card color="surface" variant="elevated">
          <v-card-title class="d-flex align-center">
            <v-icon class="mr-2" color="primary">mdi-account-multiple</v-icon>
            {{ $t('admin.usersTitle') }}
          </v-card-title>

          <v-divider />

          <v-card-text>
            <v-skeleton-loader
              v-if="loading"
              type="list-item-two-line, list-item-two-line, list-item-two-line"
            />

            <v-list v-else density="compact">
              <v-list-item
                v-for="u in users"
                :key="u.id"
                @click="selectUser(u)"
                :active="selectedUser?.id === u.id"
                rounded="lg"
              >
                <template #prepend>
                  <v-icon :color="u.role === 'admin' ? 'primary' : 'grey'">
                    {{ u.role === 'admin' ? 'mdi-shield-account' : 'mdi-account' }}
                  </v-icon>
                </template>

                <v-list-item-title>
                  {{ u.name || u.username || u.id }}
                  <span v-if="u.role === 'admin'" class="ml-2 text-caption">(admin)</span>
                </v-list-item-title>

                <v-list-item-subtitle>
                  {{ $t('admin.printersLabel') }}
                  {{
                    ((u.printers?.length ?? 0) === 0)
                      ? $t('admin.noPrinters')
                      : (u.printers?.length ?? 0)
                  }}
                </v-list-item-subtitle>

                <template #append>
                  <v-chip
                    v-if="u.role !== 'admin'"
                    size="x-small"
                    variant="tonal"
                  >
                    PIN: {{ u.pin }}
                  </v-chip>
                </template>
              </v-list-item>

              <v-list-item v-if="users.length === 0">
                <v-list-item-title>{{ $t('admin.noUsers') }}</v-list-item-title>
              </v-list-item>
            </v-list>

            <v-alert
              v-if="listError"
              class="mt-3"
              type="error"
              variant="tonal"
              density="comfortable"
            >
              {{ listError }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- ASSIGN PRINTERS -->
      <v-col cols="12" md="7">
        <v-card color="surface" variant="elevated">
          <v-card-title class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <v-icon class="mr-2" color="primary">mdi-printer-3d</v-icon>
              {{ $t('admin.assignTitle') }}
            </div>

            <v-btn
              variant="tonal"
              :disabled="!selectedUser || selectedUser.role === 'admin'"
              :loading="saving"
              @click="savePrinters"
            >
              <v-icon start>mdi-content-save</v-icon>
              {{ $t('common.save') }}
            </v-btn>
          </v-card-title>

          <v-divider />

          <v-card-text>
            <v-alert
              v-if="!selectedUser"
              type="info"
              variant="tonal"
              density="comfortable"
            >
              {{ $t('admin.selectUser') }}
            </v-alert>

            <template v-else>
              <v-alert
                v-if="selectedUser.role === 'admin'"
                type="info"
                variant="tonal"
                density="comfortable"
              >
                {{ $t('admin.adminAccess') }}
              </v-alert>

              <template v-else>
                <div class="text-body-2 mb-2">
                  {{ $t('admin.assignFor') }}
                  <strong>{{ selectedUser.name || selectedUser.id }}</strong>
                </div>

                <v-text-field
                  v-model="printerFilter"
                  :label="$t('admin.filterPrinters')"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  class="mb-3"
                />

                <v-skeleton-loader v-if="devicesLoading" type="list-item-two-line, list-item-two-line" />

                <v-list v-else density="compact">
                  <v-list-item
                    v-for="d in filteredDevices"
                    :key="d.hostname"
                    rounded="lg"
                  >
                    <template #prepend>
                      <v-checkbox-btn
                        :model-value="selectedPrintersSet.has(d.hostname)"
                        @update:model-value="(val) => toggleHostname(d.hostname, val)"
                      />
                    </template>

                    <v-list-item-title>{{ d.hostname }}</v-list-item-title>
                    <v-list-item-subtitle>{{ d.ip }}</v-list-item-subtitle>
                  </v-list-item>

                  <v-list-item v-if="filteredDevices.length === 0">
                    <v-list-item-title>{{ $t('admin.noPrintersFound') }}</v-list-item-title>
                  </v-list-item>
                </v-list>

                <v-alert
                  v-if="saveOk"
                  class="mt-3"
                  type="success"
                  variant="tonal"
                  density="comfortable"
                >
                  {{ saveOk }}
                </v-alert>

                <v-alert
                  v-if="saveError"
                  class="mt-3"
                  type="error"
                  variant="tonal"
                  density="comfortable"
                >
                  {{ saveError }}
                </v-alert>
              </template>
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { auth } from '../auth'

type User = {
  id: string
  role: 'admin' | 'user'
  username?: string
  name?: string
  pin?: string
  printers?: string[]
}

type Device = {
  hostname: string
  ip: string
}

const loading = ref(false)
const creating = ref(false)
const saving = ref(false)
const devicesLoading = ref(false)

const listError = ref('')
const createError = ref('')
const createOk = ref('')
const saveError = ref('')
const saveOk = ref('')

const users = ref<User[]>([])
const selectedUser = ref<User | null>(null)

const devices = ref<Device[]>([])
const printerFilter = ref('')

const newName = ref('')
const newPin = ref('')

const selectedPrintersSet = ref<Set<string>>(new Set())

const canCreate = computed(() => {
  const n = newName.value.trim()
  const p = newPin.value.trim()
  return n.length > 0 && /^\d{3,8}$/.test(p)
})

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  }
}

async function fetchUsers() {
  listError.value = ''
  loading.value = true
  try {
    const r = await fetch('/api/users', {
      headers: authHeaders(),
      credentials: 'include',
    })
    const text = await r.text()
    if (!r.ok) throw new Error(text || `HTTP ${r.status}`)
    const j = JSON.parse(text)
    users.value = (j.users ?? []) as User[]
  } catch (e: any) {
    listError.value = `Failed to load users: ${e?.message ?? e}`
  } finally {
    loading.value = false
  }
}

async function fetchDevices() {
  devicesLoading.value = true
  try {
    const r = await fetch('/api/devices', { headers: authHeaders(), credentials: 'include' })
    const text = await r.text()
    if (!r.ok) throw new Error(text || `HTTP ${r.status}`)
    const j = JSON.parse(text)
    // /api/devices returns a list
    devices.value = (Array.isArray(j) ? j : []).map((d: any) => ({ hostname: d.hostname, ip: d.ip }))
  } catch {
    devices.value = []
  } finally {
    devicesLoading.value = false
  }
}

function selectUser(u: User) {
  selectedUser.value = u
  selectedPrintersSet.value = new Set(u.printers ?? [])
  saveOk.value = ''
  saveError.value = ''
}

function toggleHostname(hostname: string, val: boolean) {
  const s = new Set(selectedPrintersSet.value)
  if (val) s.add(hostname)
  else s.delete(hostname)
  selectedPrintersSet.value = s
}

const filteredDevices = computed(() => {
  const q = printerFilter.value.trim().toLowerCase()
  if (!q) return devices.value
  return devices.value.filter(d =>
    d.hostname.toLowerCase().includes(q) || d.ip.toLowerCase().includes(q)
  )
})

async function createUser() {
  if (!canCreate.value) return
  createError.value = ''
  createOk.value = ''
  creating.value = true
  try {
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ name: newName.value.trim(), pin: newPin.value.trim() }),
    })
    const text = await r.text()
    if (!r.ok) throw new Error(text || `HTTP ${r.status}`)

    newName.value = ''
    newPin.value = ''
    createOk.value = 'User created.'
    await fetchUsers()
  } catch (e: any) {
    createError.value = `Create user failed: ${e?.message ?? e}`
  } finally {
    creating.value = false
  }
}

async function savePrinters() {
  if (!selectedUser.value || selectedUser.value.role === 'admin') return
  saveError.value = ''
  saveOk.value = ''
  saving.value = true
  try {
    const printers = Array.from(selectedPrintersSet.value)
    const r = await fetch(`/api/users/${encodeURIComponent(selectedUser.value.id)}/printers`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ printers }),
    })
    const text = await r.text()
    if (!r.ok) throw new Error(text || `HTTP ${r.status}`)

    saveOk.value = 'Assignments saved.'
    await fetchUsers()

    // refresh selected user snapshot from updated list
    const updated = users.value.find(x => x.id === selectedUser.value?.id) || null
    if (updated) selectUser(updated)
  } catch (e: any) {
    saveError.value = `Save failed: ${e?.message ?? e}`
  } finally {
    saving.value = false
  }
}

async function refreshAll() {
  await Promise.all([fetchUsers(), fetchDevices()])
}

onMounted(refreshAll)
</script>

<style scoped>
/* keep it simple; your global theme handles most */
</style>
