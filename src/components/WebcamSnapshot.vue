<template>
  <div ref="container" class="webcam-snapshot">
    <div class="webcam-controls" @click.stop @dblclick.stop>
      <select v-if="cameras.length > 1" v-model.number="selectedIndex" :aria-label="$t('printerList.webcam.camera')">
        <option v-for="(camera, index) in cameras" :key="camera.uid || camera.name" :value="index">{{ camera.name }}</option>
      </select>
      <span v-else>{{ selectedCamera?.name }}</span>
      <v-btn
        v-if="hasSnapshot"
        size="x-small"
        icon
        variant="text"
        :aria-label="$t(paused ? 'printerList.webcam.resume' : 'printerList.webcam.pause')"
        :title="$t(paused ? 'printerList.webcam.resume' : 'printerList.webcam.pause')"
        @click="paused = !paused"
      >
        <v-icon>{{ paused ? 'mdi-play' : 'mdi-pause' }}</v-icon>
      </v-btn>
    </div>
    <div class="snapshot-frame" :style="{ aspectRatio: frameAspectRatio }">
      <img
        v-for="url in imageUrls"
        v-show="url === displayedUrl"
        :key="url"
        ref="snapshotImages"
        class="snapshot-image"
        :src="url"
        :alt="$t('printerList.webcam.alt', { name: selectedCamera?.name })"
        :style="imageStyle"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div v-if="!displayedUrl || snapshotState === 'error' || snapshotState === 'invalid'" class="snapshot-placeholder" :class="{ 'snapshot-overlay': displayedUrl }" role="status">
        <v-progress-circular v-if="settingsState === 'loading' || snapshotState === 'loading'" indeterminate size="24" width="2" color="primary" />
        <v-icon v-else size="36">{{ paused ? 'mdi-pause-circle-outline' : 'mdi-camera-outline' }}</v-icon>
        <span>{{ $t(`printerList.webcam.${placeholderKey}`) }}</span>
        <small v-if="settingsState === 'error' || (settingsState === 'ready' && !hasSnapshot)">
          {{ $t('printerList.webcam.configure') }}
        </small>
        <v-btn v-if="settingsState === 'error' || snapshotState === 'error' || snapshotState === 'invalid' || (settingsState === 'ready' && !hasSnapshot)" size="small" variant="text" @click.stop="reloadVersion++" @dblclick.stop>
          {{ $t('printerList.webcam.retry') }}
        </v-btn>
      </div>
    </div>
    <div class="snapshot-caption">{{ $t('printerList.webcam.interval') }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDocumentVisibility, useElementVisibility } from '@vueuse/core'

type Camera = {
  uid?: string
  name: string
  enabled?: boolean
  snapshot_url?: string
  flip_horizontal?: boolean
  flip_vertical?: boolean
  rotation?: number
}
type WebcamResponse = { result?: { webcams?: Camera[] }; webcams?: Camera[] }

const props = defineProps<{ baseUrl: string; uiUrl: string }>()
const container = ref<HTMLElement | null>(null)
const snapshotImages = ref<HTMLImageElement[]>([])
const visible = useElementVisibility(container)
const documentVisibility = useDocumentVisibility()
const cameras = ref<Camera[]>([])
const selectedIndex = ref(0)
const selectedCamera = computed(() => cameras.value[selectedIndex.value])
const hasSnapshot = computed(() => typeof selectedCamera.value?.snapshot_url === 'string' && selectedCamera.value.snapshot_url.trim().length > 0)
const paused = ref(false)
const reloadVersion = ref(0)
const settingsState = ref<'loading' | 'ready' | 'error'>('loading')
const snapshotState = ref<'idle' | 'loading' | 'ready' | 'error' | 'invalid'>('idle')
const snapshotUrl = ref('')
const displayedUrl = ref('')
const imageUrls = computed(() => [displayedUrl.value, snapshotUrl.value].filter(Boolean))
const canRefresh = computed(() => settingsState.value === 'ready' && hasSnapshot.value &&
  visible.value && documentVisibility.value === 'visible' && !paused.value)

const rotation = computed(() => [0, 90, 180, 270].includes(selectedCamera.value?.rotation ?? 0) ? selectedCamera.value?.rotation ?? 0 : 0)
const rotated = computed(() => rotation.value === 90 || rotation.value === 270)
const frameAspectRatio = 16 / 9
const imageStyle = computed(() => ({
  width: rotated.value ? `${100 / frameAspectRatio}%` : '100%',
  height: rotated.value ? `${100 * frameAspectRatio}%` : '100%',
  transform: `translate(-50%, -50%) rotate(${rotation.value}deg) scale(${selectedCamera.value?.flip_horizontal ? -1 : 1}, ${selectedCamera.value?.flip_vertical ? -1 : 1})`,
}))
const placeholderKey = computed(() => {
  if (settingsState.value === 'loading') return 'loadingSettings'
  if (settingsState.value === 'error') return 'settingsFailed'
  if (!selectedCamera.value) return 'noCamera'
  if (!hasSnapshot.value) return 'noSnapshot'
  if (!canRefresh.value) return 'paused'
  if (snapshotState.value === 'invalid') return 'invalidUrl'
  return snapshotState.value === 'error' ? 'snapshotFailed' : 'loadingSnapshot'
})

const REFRESH_MS = 1_000
const SNAPSHOT_TIMEOUT_MS = 10_000
let refreshTimer: number | undefined
let snapshotTimeout: number | undefined
let snapshotSequence = 0

function stopSnapshot() {
  window.clearTimeout(refreshTimer)
  window.clearTimeout(snapshotTimeout)
  snapshotImages.value.find(image => image.src === snapshotUrl.value)?.removeAttribute('src')
  snapshotUrl.value = ''
}

function scheduleNext() {
  if (canRefresh.value) refreshTimer = window.setTimeout(loadSnapshot, REFRESH_MS)
}

function failSnapshot() {
  stopSnapshot()
  snapshotState.value = 'error'
  console.warn('[WebcamSnapshot] Snapshot unavailable:', selectedCamera.value?.name)
  scheduleNext()
}

function loadSnapshot() {
  stopSnapshot()
  const camera = selectedCamera.value
  if (!canRefresh.value || !camera?.snapshot_url?.trim()) {
    snapshotState.value = 'idle'
    return
  }
  try {
    const url = new URL(camera.snapshot_url, `${new URL(props.uiUrl).origin}/`)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Snapshot URL must use HTTP or HTTPS')
    url.searchParams.set('_helm_ts', `${Date.now()}-${++snapshotSequence}`)
    if (snapshotState.value !== 'error') snapshotState.value = 'loading'
    snapshotUrl.value = url.href
    snapshotTimeout = window.setTimeout(failSnapshot, SNAPSHOT_TIMEOUT_MS)
  } catch (error) {
    snapshotState.value = 'invalid'
    console.warn('[WebcamSnapshot] Invalid snapshot URL:', selectedCamera.value?.name, error)
  }
}

function isCurrentImage(event: Event) {
  return canRefresh.value && snapshotUrl.value !== '' && event.target instanceof HTMLImageElement &&
    event.target.src === snapshotUrl.value
}

function onImageLoad(event: Event) {
  if (!isCurrentImage(event)) return
  window.clearTimeout(snapshotTimeout)
  displayedUrl.value = snapshotUrl.value
  snapshotUrl.value = ''
  snapshotState.value = 'ready'
  scheduleNext()
}

function onImageError(event: Event) {
  if (isCurrentImage(event)) failSnapshot()
}

watch([() => props.baseUrl, reloadVersion], async (_, __, onCleanup) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5_000)
  let cancelled = false
  onCleanup(() => {
    cancelled = true
    controller.abort()
    window.clearTimeout(timeout)
  })
  settingsState.value = 'loading'
  cameras.value = []
  selectedIndex.value = 0
  try {
    const response = await fetch(`${props.baseUrl.replace(/\/+$/, '')}/server/webcams/list`, { signal: controller.signal })
    if (!response.ok) throw new Error(`Camera settings returned HTTP ${response.status}`)
    const data: WebcamResponse = await response.json()
    const listed = data.result?.webcams ?? data.webcams
    if (!Array.isArray(listed) || listed.some(camera => !camera || typeof camera.name !== 'string')) throw new Error('Invalid webcam settings response')
    if (cancelled || controller.signal.aborted) return
    cameras.value = listed.filter(camera => camera.enabled !== false)
    settingsState.value = 'ready'
  } catch (error) {
    if (cancelled) return
    settingsState.value = 'error'
    console.warn('[WebcamSnapshot] Could not load camera settings:', props.baseUrl, error)
  } finally {
    window.clearTimeout(timeout)
  }
}, { immediate: true })

watch([selectedCamera, () => props.uiUrl], () => {
  displayedUrl.value = ''
  snapshotState.value = 'idle'
  loadSnapshot()
}, { immediate: true })
watch(canRefresh, loadSnapshot)
onBeforeUnmount(stopSnapshot)
</script>

<style scoped>
.webcam-snapshot {
  min-width: 0;
  border: 1px solid var(--helm-border);
  border-radius: var(--helm-radius-sm);
  overflow: hidden;
  background: var(--helm-nav);
}
.webcam-controls {
  box-sizing: border-box;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: 12px;
}
.webcam-controls > span,
.webcam-controls select {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.webcam-controls select {
  padding: 6px;
  color: var(--helm-fg);
  background: var(--helm-surface);
  border: 1px solid var(--helm-border);
  border-radius: 4px;
}
.webcam-controls select:focus-visible {
  outline: 2px solid var(--helm-brand);
}
.snapshot-frame {
  position: relative;
  overflow: hidden;
}
.snapshot-image {
  position: absolute;
  top: 50%;
  left: 50%;
  object-fit: contain;
}
.snapshot-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: var(--helm-muted);
  font-size: 12px;
  text-align: center;
}
.snapshot-placeholder small {
  font-size: 10px;
}
.snapshot-overlay {
  background: rgba(0, 0, 0, 0.75);
}
.snapshot-caption {
  padding: 6px 8px;
  color: var(--helm-muted);
  border-top: 1px solid var(--helm-border);
  font-size: 10px;
}
</style>
