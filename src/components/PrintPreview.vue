<template>
  <div class="print-preview">
    <v-img
      v-if="imageUrl && !failed"
      :key="imageUrl"
      :src="imageUrl"
      :alt="$t('printerList.card.previewAlt', { filename })"
      aspect-ratio="1.6"
      @error="onImageError"
    >
      <template #placeholder>
        <div class="preview-placeholder" role="status">
          <v-progress-circular indeterminate size="24" width="2" color="primary" />
          <span>{{ $t('printerList.card.previewLoading') }}</span>
        </div>
      </template>
    </v-img>
    <div v-else class="preview-placeholder" role="status">
      <v-progress-circular v-if="loading" indeterminate size="24" width="2" color="primary" />
      <v-icon v-else size="36" :color="failed ? 'warning' : undefined">
        {{ failed ? 'mdi-image-broken-variant' : 'mdi-image-outline' }}
      </v-icon>
      <span>{{ $t(loading ? 'printerList.card.previewLoading' : failed ? 'printerList.card.previewFailed' : 'printerList.card.noPreview') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ baseUrl: string; filename: string }>()
const imageUrl = ref('')
const loading = ref(false)
const failed = ref(false)

type Thumbnail = { relative_path: string; width?: number; height?: number }
type Metadata = { result?: { thumbnails?: Thumbnail[] } }

function onImageError() {
  failed.value = true
  console.warn('[PrintPreview] Failed to load thumbnail:', imageUrl.value)
}

watch(
  () => [props.baseUrl, props.filename] as const,
  async ([baseUrl, filename], _, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    imageUrl.value = ''
    failed.value = false
    loading.value = false
    if (!filename) return

    loading.value = true
    try {
      const base = baseUrl.replace(/\/+$/, '')
      const response = await fetch(`${base}/server/files/metadata?filename=${encodeURIComponent(filename)}`, {
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Metadata returned HTTP ${response.status}`)
      const data: Metadata = await response.json()
      if (!data.result) throw new Error('Invalid thumbnail metadata response')
      const thumbnails = data.result.thumbnails ?? []
      if (!Array.isArray(thumbnails)) throw new Error('Invalid thumbnail list')
      const thumbnail = thumbnails
        .filter(item => typeof item.relative_path === 'string' && item.relative_path.length > 0)
        .sort((a, b) => ((b.width ?? 0) * (b.height ?? 0)) - ((a.width ?? 0) * (a.height ?? 0)))[0]
      if (controller.signal.aborted || !thumbnail) return
      const directory = filename.slice(0, filename.lastIndexOf('/') + 1)
      const path = `${directory}${thumbnail.relative_path}`.split('/').map(encodeURIComponent).join('/')
      imageUrl.value = `${base}/server/files/gcodes/${path}`
    } catch (error) {
      if (controller.signal.aborted) return
      failed.value = true
      console.warn('[PrintPreview] Could not load preview metadata:', filename, error)
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.print-preview {
  aspect-ratio: 1.6;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--helm-border);
  border-radius: var(--helm-radius-sm);
  background: var(--helm-nav);
}
.preview-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--helm-muted);
  font-size: 12px;
  text-align: center;
}
</style>
