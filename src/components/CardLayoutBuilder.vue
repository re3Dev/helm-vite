<template>
  <v-dialog :model-value="true" persistent scrollable max-width="1040">
    <v-card color="background" class="card-builder">
      <v-card-title>{{ $t('cardBuilder.title') }}</v-card-title>
      <v-card-text>
        <v-alert v-if="storageError" type="error" variant="tonal" class="mb-4">{{ storageError }}</v-alert>
        <div class="builder-columns">
          <div class="builder-editor">
            <v-text-field
              v-model="draft.name"
              :label="$t('cardBuilder.name')"
              :aria-label="$t('cardBuilder.name')"
              :error-messages="draft.name.trim() && duplicateName ? [$t('cardBuilder.duplicateName')] : []"
              maxlength="60"
              counter="60"
              density="compact"
              autofocus
            />
            <p class="builder-description">{{ $t('cardBuilder.description') }}</p>
            <div class="builder-fixed">
              <v-icon size="18">mdi-lock-outline</v-icon>
              <span>{{ $t('cardBuilder.fixedSections') }}</span>
            </div>
            <div v-for="(section, index) in draft.sections" :key="section.type" class="builder-section" :data-builder-section="section.type">
              <div class="builder-section-heading">
                <v-checkbox
                  v-model="section.enabled"
                  :label="$t(`cardBuilder.sections.${section.type}`)"
                  density="compact"
                  hide-details
                />
                <v-btn icon size="small" variant="text" :disabled="index === 0" :aria-label="$t('cardBuilder.moveUp', { section: $t(`cardBuilder.sections.${section.type}`) })" @click="moveSection(index, -1)">
                  <v-icon>mdi-arrow-up</v-icon>
                </v-btn>
                <v-btn icon size="small" variant="text" :disabled="index === draft.sections.length - 1" :aria-label="$t('cardBuilder.moveDown', { section: $t(`cardBuilder.sections.${section.type}`) })" @click="moveSection(index, 1)">
                  <v-icon>mdi-arrow-down</v-icon>
                </v-btn>
              </div>
              <v-select
                v-model="section.display"
                :label="$t('cardBuilder.display')"
                :aria-label="`${$t(`cardBuilder.sections.${section.type}`)}: ${$t('cardBuilder.display')}`"
                :items="displayOptions"
                :disabled="!section.enabled"
                density="compact"
                hide-details
              />
            </div>
          </div>
          <div class="builder-preview">
            <h2>{{ $t('cardBuilder.livePreview') }}</h2>
            <p class="builder-description">{{ $t('cardBuilder.sampleHint') }}</p>
            <div class="builder-sample-card">
              <div class="builder-sample-header">
                <div>
                  <strong class="printer-name">{{ $t('cardBuilder.samplePrinter') }}</strong>
                  <small>Gigabot 4 · 192.0.2.1</small>
                </div>
                <v-icon size="18" color="primary">mdi-lock</v-icon>
              </div>
              <div class="builder-sample-status">
                <v-icon size="18">mdi-printer-3d-nozzle</v-icon>
                {{ $t('printerList.status.printing') }}
              </div>
              <CustomCardSections :sections="draft.sections" :printer="samplePrinter" preview />
            </div>
          </div>
        </div>
      </v-card-text>
      <v-card-actions class="builder-actions">
        <small>{{ $t('cardBuilder.localOnly') }}</small>
        <v-spacer />
        <v-btn variant="text" @click="$emit('cancel')">{{ $t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="tonal" :disabled="!draft.name.trim() || duplicateName" @click="$emit('save', { ...draft, name: draft.name.trim() })">{{ $t('cardBuilder.saveAndApply') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import CustomCardSections from './CustomCardSections.vue'
import { copyCardLayout } from './cardLayouts'
import type { CustomCardLayout, CustomCardData } from './cardLayouts'

const props = defineProps<{ layout: CustomCardLayout; layouts: CustomCardLayout[]; storageError: string }>()
defineEmits<{ save: [layout: CustomCardLayout]; cancel: [] }>()
const { t } = useI18n()
const draft = ref(copyCardLayout(props.layout))
const duplicateName = computed(() => props.layouts.some(layout =>
  layout.id !== draft.value.id && layout.name.toLocaleLowerCase() === draft.value.name.trim().toLocaleLowerCase()))
const displayOptions = computed(() => [
  { title: t('cardBuilder.compact'), value: 'compact' },
  { title: t('cardBuilder.expanded'), value: 'expanded' },
])
const samplePrinter = computed<CustomCardData>(() => ({
  baseUrl: '',
  uiUrl: '',
  printing: true,
  ready: true,
  filename: 'Sample_Part.gcode',
  progress: 43,
  temperatures: [
    { label: 'E0', icon: 'mdi-printer-3d-nozzle', current: 180, target: 200, state: 'heating', progress: 90 },
    { label: 'E1', icon: 'mdi-printer-3d-nozzle', current: 200, target: 200, state: 'on', progress: 100 },
    { label: t('printerList.card.bed'), icon: 'mdi-radiator', current: 60, target: 60, state: 'on', progress: 100 },
  ],
}))

function moveSection(index: number, delta: -1 | 1) {
  const next = index + delta
  if (next < 0 || next >= draft.value.sections.length) return
  const sections = [...draft.value.sections]
  ;[sections[index], sections[next]] = [sections[next], sections[index]]
  draft.value.sections = sections
}
</script>

<style scoped>
.card-builder { max-height: 90dvh; }
.builder-columns { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; }
.builder-editor, .builder-preview { min-width: 0; }
.builder-description { font-size: 12px; color: var(--helm-muted); margin-bottom: 14px; }
.builder-fixed { display: flex; align-items: center; gap: 8px; padding: 12px; margin-bottom: 14px; border: 1px dashed var(--helm-border-strong); border-radius: 8px; font-size: 12px; }
.builder-section { padding: 10px; margin-bottom: 10px; background: var(--helm-nav); border: 1px solid var(--helm-border); border-radius: 8px; }
.builder-section-heading { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
.builder-section-heading .v-checkbox { flex: 1; min-width: 0; }
.builder-preview h2 { font-size: 16px; margin-bottom: 6px; }
.builder-sample-card { padding: 16px; display: flex; flex-direction: column; gap: 14px; background: var(--helm-surface); border: 1px solid var(--helm-border); border-radius: var(--helm-radius); }
.builder-sample-header { display: flex; justify-content: space-between; gap: 8px; }
.builder-sample-header > div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.builder-sample-header small { font-size: 11px; color: var(--helm-muted); }
.builder-sample-status { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-left: 3px solid var(--helm-brand); border-radius: 4px; background: var(--helm-nav); color: var(--helm-brand); font-size: 12px; font-weight: 700; }
.builder-actions { flex-wrap: wrap; }
.builder-actions > small { color: var(--helm-muted); font-size: 11px; }
@media (max-width: 700px) {
  .builder-columns { grid-template-columns: minmax(0, 1fr); }
  .builder-actions > small { flex-basis: 100%; padding: 4px 8px; }
}
</style>
