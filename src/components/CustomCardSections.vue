<template>
  <div class="custom-card-sections">
    <section
      v-for="section in sections.filter(item => item.enabled)"
      :key="section.type"
      class="custom-card-section"
      :class="[`section-${section.type}`, `section-${section.display}`]"
      :data-card-section="section.type"
      :data-display="section.display"
    >
      <div v-if="section.type === 'job'" class="custom-job" :title="printer.printing ? printer.filename : ''">
        <v-icon size="18">mdi-file-outline</v-icon>
        <span>{{ printer.printing ? printer.filename : $t('printerList.notPrinting') }}</span>
      </div>

      <div v-else-if="section.type === 'progress'" class="custom-progress">
        <template v-if="printer.printing && printer.ready">
          <strong>{{ printer.progress }}<small>%</small></strong>
          <v-progress-linear :model-value="printer.progress" :height="section.display === 'expanded' ? 10 : 5" rounded color="primary" :aria-label="$t('printerList.columns.progress')" />
        </template>
        <span v-else class="custom-empty">{{ $t('printerList.notPrinting') }}</span>
      </div>

      <div v-else-if="section.type === 'temperatures'" class="custom-temperatures">
        <div v-for="temp in printer.temperatures" :key="temp.label" class="custom-temperature" :data-heater-state="temp.state">
          <div class="custom-temp-heading">
            <v-icon v-if="section.display === 'expanded'" size="18">{{ temp.icon }}</v-icon>
            <span>{{ temp.label }}</span>
            <small v-if="section.display === 'expanded'">{{ $t(`printerList.heater.${temp.state}`) }}</small>
          </div>
          <strong>{{ Math.round(temp.current) }}°<small v-if="section.display === 'expanded'">C</small></strong>
          <span class="custom-target">
            <template v-if="section.display === 'expanded'">{{ $t('printerList.card.target') }} </template>
            {{ temp.target === null ? $t('printerList.card.targetUnavailable') : `→ ${Math.round(temp.target)}°` }}
          </span>
          <v-progress-linear
            v-if="section.display === 'expanded' && temp.target !== null && temp.target > 0"
            :model-value="temp.progress"
            color="primary"
            height="4"
            rounded
            :aria-label="$t('printerList.card.targetProgress', { heater: temp.label })"
          />
        </div>
        <span v-if="!printer.temperatures.length" class="custom-empty">{{ $t('printerList.card.noTemperatures') }}</span>
      </div>

      <div v-else-if="preview" class="custom-media-preview">
        <v-icon size="48" color="primary">{{ section.type === 'webcam' ? 'mdi-webcam' : 'mdi-printer-3d' }}</v-icon>
        <span>{{ $t(`cardBuilder.sections.${section.type}`) }}</span>
      </div>
      <PrintPreview v-else-if="section.type === 'preview'" :base-url="printer.baseUrl" :filename="printer.printing ? printer.filename : ''" />
      <WebcamSnapshot v-else-if="section.type === 'webcam'" :base-url="printer.baseUrl" :ui-url="printer.uiUrl" />
    </section>
  </div>
</template>

<script setup lang="ts">
import PrintPreview from './PrintPreview.vue'
import WebcamSnapshot from './WebcamSnapshot.vue'
import type { CardSection, CustomCardData } from './cardLayouts'

defineProps<{ sections: CardSection[]; printer: CustomCardData; preview?: boolean }>()
</script>

<style scoped>
.custom-card-sections {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}
.custom-card-sections:empty { display: none; }
.custom-card-section { min-width: 0; }
.custom-job {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.custom-job > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.section-expanded .custom-job {
  padding: 12px;
  background: var(--helm-nav);
  border: 1px solid var(--helm-border);
  border-radius: var(--helm-radius-sm);
  font-size: 16px;
}
.section-expanded .custom-job > span {
  white-space: normal;
  overflow-wrap: anywhere;
}
.custom-progress { display: flex; flex-direction: column; gap: 8px; }
.custom-progress > strong { color: var(--helm-brand); font-variant-numeric: tabular-nums; }
.section-expanded .custom-progress { align-items: center; padding: 12px 0; }
.section-expanded .custom-progress > strong { font-size: 52px; line-height: 1; }
.custom-progress small { font-size: 0.5em; margin-left: 2px; }
.custom-temperatures { display: flex; flex-wrap: wrap; gap: 12px; }
.custom-temperature { display: flex; flex-direction: column; gap: 4px; min-width: 0; font-size: 12px; }
.custom-temp-heading { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.custom-temp-heading,
.custom-target,
.custom-empty { color: var(--helm-muted); font-size: 11px; }
.custom-temp-heading small { margin-left: auto; font-size: 10px; }
.section-expanded .custom-temperatures { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.section-expanded .custom-temperature {
  --heater-color: var(--helm-muted);
  padding: 12px;
  gap: 10px;
  border: 1px solid var(--helm-border);
  border-top: 2px solid var(--heater-color);
  border-radius: var(--helm-radius-sm);
  background: var(--helm-nav);
}
.section-expanded .custom-temperature:only-child { grid-column: 1 / -1; }
.custom-temperature[data-heater-state="heating"] { --heater-color: rgb(var(--v-theme-warning)); }
.custom-temperature[data-heater-state="on"] { --heater-color: rgb(var(--v-theme-success)); }
.custom-temperature[data-heater-state="cooling"] { --heater-color: rgb(var(--v-theme-info)); }
.section-expanded .custom-temp-heading { color: var(--heater-color); }
.section-expanded .custom-temperature > strong { font-size: 32px; line-height: 1; font-variant-numeric: tabular-nums; }
.custom-temperature > strong small { font-size: 14px; color: var(--helm-muted); font-weight: 400; }
.section-preview.section-compact,
.section-webcam.section-compact { width: 100%; max-width: 240px; align-self: center; }
.custom-media-preview {
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--helm-nav);
  border: 1px solid var(--helm-border);
  border-radius: var(--helm-radius-sm);
  color: var(--helm-muted);
  font-size: 12px;
}
</style>
