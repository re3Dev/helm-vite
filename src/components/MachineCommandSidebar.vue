<template>
  <div class="pm-shell">
    <div
      class="sidebar-container"
      :style="{ width: isCollapsed ? '0px' : sidebarWidth + 'px' }"
    >
      <div v-show="!isCollapsed" class="pm-drawer">
        <!-- ✅ Header: mirror of right rail (arrow far LEFT, title on RIGHT) -->
        <div class="sidebar-header">
          <div class="header-content header-content-mirror">
            <v-btn
              icon
              variant="text"
              size="small"
              class="header-close header-close-left"
              @click="toggleCollapse"
              :title="$t('sidebar.collapse')"
              :aria-label="$t('sidebar.collapse')"
            >
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>

            <div class="header-title header-title-right">{{ $t('sidebar.title') }}</div>
          </div>
        </div>

        <!-- Body (unchanged; keeps Movement formatting correct) -->
        <div class="drawer-body">
          <v-expansion-panels multiple class="sidebar-panels">
            <v-expansion-panel v-for="(group, gIdx) in groups" :key="gIdx" class="sidebar-panel">
              <v-expansion-panel-title class="sidebar-panel-title">
                <v-icon color="primary">{{ group.icon }}</v-icon>&nbsp;
                {{ tGroup(group.title) }}
              </v-expansion-panel-title>

              <v-expansion-panel-text class="sidebar-panel-text">
                <!-- MOVEMENT -->
                <template v-if="group.title === 'Movement'">
                  <div class="movement-wrap">
                    <div class="step-row">
                      <v-btn
                        v-for="cmd in stepCommands(group.commands)"
                        :key="cmd.label"
                        :color="movementBtnColor(cmd)"
                        :variant="movementBtnVariant(cmd)"
                        class="step-btn"
                        :class="{ 'step-active': isStepActive(cmd) }"
                        @click="runCommand(cmd)"
                      >
                        {{ cmd.label }}
                      </v-btn>
                    </div>

                    <div class="move-two-col">
                      <div class="movement-grid">
                        <v-btn
                          v-for="cmd in gridCommands(group.commands)"
                          :key="cmd.icon || cmd.label"
                          :color="movementBtnColor(cmd)"
                          :variant="movementBtnVariant(cmd)"
                          class="movement-btn"
                          @click="runCommand(cmd)"
                        >
                          <v-icon v-if="cmd.icon">{{ cmd.icon }}</v-icon>
                          <span v-else>{{ cmd.label }}</span>
                        </v-btn>
                      </div>

                      <div class="z-col">
                        <div class="z-stack">
                          <v-btn
                            v-if="zUpCommand(group.commands)"
                            :color="movementBtnColor(zUpCommand(group.commands))"
                            :variant="movementBtnVariant(zUpCommand(group.commands))"
                            class="z-tall z-top"
                            @click="runCommand(zUpCommand(group.commands))"
                          >
                            <v-icon v-if="zUpCommand(group.commands)?.icon">
                              {{ zUpCommand(group.commands).icon }}
                            </v-icon>
                            <span v-else>{{ zUpCommand(group.commands)?.label }}</span>
                          </v-btn>

                          <v-btn
                            v-if="zDownCommand(group.commands)"
                            :color="movementBtnColor(zDownCommand(group.commands))"
                            :variant="movementBtnVariant(zDownCommand(group.commands))"
                            class="z-tall z-bottom"
                            @click="runCommand(zDownCommand(group.commands))"
                          >
                            <v-icon v-if="zDownCommand(group.commands)?.icon">
                              {{ zDownCommand(group.commands).icon }}
                            </v-icon>
                            <span v-else>{{ zDownCommand(group.commands)?.label }}</span>
                          </v-btn>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- PRINT -->
                <template v-else-if="group.title === 'Print'">
                  <div class="print-wrap">
                    <div class="print-controls">
                      <v-btn
                        v-for="cmd in printControlCommands(group.commands)"
                        :key="cmd.label"
                        class="print-control-btn"
                        :color="cmd.color"
                        :variant="cmd.variant"
                        @click="runCommand(cmd)"
                      >
                        <v-icon start v-if="cmd.icon">{{ cmd.icon }}</v-icon>
                        {{ shortLabel(cmd.label) }}
                      </v-btn>
                    </div>

                    <div class="print-row">
                      <div class="grow">
                        <v-autocomplete
                          ref="gcodeAutocomplete"
                          v-if="printSelectCommand(group.commands)"
                          v-model="selectedPrintFile"
                          :label="$t('print.selectFile')"
                          :items="gcodeFiles"
                          density="compact"
                          hide-details
                          clearable
                          class="sidebar-input gcode-autocomplete"
                          :menu-props="{ maxHeight: 300, contentClass: 'gcode-menu-content' }"
                          @update:modelValue="v => runCommand(printSelectCommand(group.commands), v)"
                          @update:menu="onGcodeMenuChange"
                        />
                      </div>

                      <v-btn
                        v-if="printRefreshCommand(group.commands)"
                        class="icon-btn"
                        icon
                        :color="printRefreshCommand(group.commands).color"
                        :variant="printRefreshCommand(group.commands).variant"
                        @click="runCommand(printRefreshCommand(group.commands))"
                      >
                        <v-icon>{{ printRefreshCommand(group.commands).icon || 'mdi-refresh' }}</v-icon>
                      </v-btn>
                    </div>

                    <div class="print-upload">
                      <v-file-input
                        v-if="printUploadCommand(group.commands)"
                        :label="$t('print.uploadFile')"
                        :accept="printUploadCommand(group.commands).accept?.join(',')"
                        :color="printUploadCommand(group.commands).color"
                        prepend-icon="mdi-upload"
                        density="compact"
                        hide-details
                        class="file-upload-input sidebar-input"
                        @update:modelValue="val => onFilePicked(gIdx, val)"
                      />

                      <v-btn
                        block
                        size="small"
                        color="primary"
                        variant="tonal"
                        :disabled="!pendingFiles[gIdx] || uploadState[gIdx]?.loading"
                        :loading="uploadState[gIdx]?.loading"
                        @click="uploadPickedFile(printUploadCommand(group.commands), gIdx)"
                        class="primary-action"
                      >
                        <v-icon start>mdi-cloud-upload</v-icon>
                        {{ $t('common.upload') }}
                      </v-btn>

                      <div
                        v-if="uploadState[gIdx]?.msg"
                        class="upload-status"
                        :class="{ ok: uploadState[gIdx]?.ok === true, bad: uploadState[gIdx]?.ok === false }"
                      >
                        {{ uploadState[gIdx]?.msg }}
                      </div>
                    </div>

                  </div>
                </template>

                <!-- TEMPERATURE -->
                <template v-else-if="group.title === 'Temperature'">
                  <div class="temp-wrap">
                    <div v-for="cmd in tempCommands(group.commands)" :key="cmd.label" class="temp-row">
                      <v-text-field
                        v-model="tempValues[cmd.label]"
                        :label="tLabel(cmd.label)"
                        type="number"
                        :min="cmd.min"
                        :max="cmd.max"
                        :suffix="cmd.unit"
                        density="compact"
                        hide-details
                        class="sidebar-input temp-input"
                        @keyup.enter="setTemperature(cmd)"
                      />

                      <v-btn
                        class="temp-set-btn"
                        color="primary"
                        variant="tonal"
                        @click="setTemperature(cmd)"
                      >
                        {{ $t('common.set') }}
                      </v-btn>
                    </div>

                    <v-btn
                      v-for="cmd in tempActionCommands(group.commands)"
                      :key="cmd.label"
                      block
                      class="temp-cooldown-btn"
                      :color="cmd.color || 'blue'"
                      :variant="cmd.variant || 'outlined'"
                      @click="runCommand(cmd)"
                    >
                      <v-icon start v-if="cmd.icon">{{ cmd.icon }}</v-icon>
                      {{ tLabel(cmd.label) }}
                    </v-btn>
                  </div>
                </template>

                <!-- EVERYTHING ELSE -->
                <template v-else>
                  <v-list class="sidebar-list">
                    <v-list-item v-for="(cmd, cIdx) in group.commands" :key="cIdx" class="sidebar-list-item">
                      <template v-if="cmd.type === 'button'">
                        <v-btn block @click="runCommand(cmd)" :color="cmd.color" :variant="cmd.variant" class="list-btn">
                          <v-icon v-if="cmd.icon">{{ cmd.icon }}</v-icon>
                          {{ cmd.label }}
                        </v-btn>
                      </template>

                      <template v-else-if="cmd.type === 'number'">
                        <v-text-field
                          :label="cmd.label"
                          type="number"
                          :min="cmd.min"
                          :max="cmd.max"
                          :suffix="cmd.unit"
                          :value="cmd.default"
                          @change="value => runCommand(cmd, value)"
                          density="compact"
                          hide-details
                          class="sidebar-input"
                        />
                      </template>

                      <template v-else-if="cmd.type === 'dropdown'">
                        <v-select
                          :label="cmd.label"
                          :items="cmd.options"
                          @change="value => runCommand(cmd, value)"
                          density="compact"
                          hide-details
                          class="sidebar-input"
                        />
                      </template>

                      <template v-else-if="cmd.type === 'gcode-input'">
                        <v-text-field
                          v-model="gcodeInputs[gIdx]"
                          :label="cmd.label"
                          placeholder="Enter G-code (e.g. M119)"
                          @keyup.enter="runCommand(cmd, gcodeInputs[gIdx]); gcodeInputs[gIdx] = ''"
                          hide-details
                          density="compact"
                          class="sidebar-input"
                          style="width: 100%; max-width: 100%; display: block; margin-bottom: 6px;"
                        />
                        <v-btn
                          block
                          size="small"
                          color="grey"
                          variant="outlined"
                          @click="runCommand(cmd, gcodeInputs[gIdx]); gcodeInputs[gIdx] = ''"
                          class="list-btn"
                        >
                          {{ $t('common.send') }}
                        </v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </template>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- G-code Terminal Panel -->
            <v-expansion-panel class="sidebar-panel">
              <v-expansion-panel-title class="sidebar-panel-title">
                <v-icon color="primary">mdi-console</v-icon>&nbsp;
                {{ $t('terminal.title') }}
              </v-expansion-panel-title>

              <v-expansion-panel-text class="sidebar-panel-text">
                <div class="terminal-wrap">
                  <v-textarea
                    v-model="terminalText['_standalone']"
                    auto-grow
                    rows="3"
                    max-rows="8"
                    density="compact"
                    :placeholder="$t('terminal.placeholder')"
                    hide-details
                    class="terminal-box sidebar-input"
                  />

                  <div class="terminal-actions">
                    <v-btn
                      class="terminal-send"
                      size="small"
                      color="grey"
                      variant="outlined"
                      :disabled="!terminalText['_standalone'] || !terminalText['_standalone'].trim()"
                      @click="sendTerminal('_standalone', printGroupCommands)"
                    >
                      {{ $t('common.send') }}
                    </v-btn>

                    <v-btn
                      class="terminal-clear"
                      size="small"
                      color="grey"
                      variant="text"
                      @click="terminalText['_standalone'] = ''"
                    >
                      {{ $t('common.clear') }}
                    </v-btn>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Settings Panel removed: Network Settings moved to the 3-dot menu in the printer list -->
          </v-expansion-panels>
        </div>
      </div>

      <div v-if="!isCollapsed" class="resizer" @mousedown.stop.prevent="startResize"></div>

    </div>

    <v-btn
      v-if="isCollapsed"
      class="rail-toggle square yellow-accent"
      icon
      @click="toggleCollapse"
      :title="$t('sidebar.expand')"
      :aria-label="$t('sidebar.expand')"
    >
      <v-icon>mdi-chevron-right</v-icon>
    </v-btn>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineProps } from 'vue'
import { useI18n } from 'vue-i18n'
import { runCommand, selectedStepSize, refreshFileListFromBackend, gcodeFiles, scannerCidr, selectedPrintFile } from './commandService.ts'

const { t } = useI18n()

/** Translate group titles (keeps internal keys unchanged for conditional logic) */
const GROUP_TITLE_KEYS = {
  'Print': 'sidebar.groups.print',
  'Movement': 'sidebar.groups.movement',
  'Temperature': 'sidebar.groups.temperature',
}
function tGroup(title) {
  return GROUP_TITLE_KEYS[title] ? t(GROUP_TITLE_KEYS[title]) : title
}

/** Translate command labels */
const CMD_LABEL_KEYS = {
  'Start Print':       'print.startPrint',
  'Pause Print':       'print.pausePrint',
  'Stop Print':        'print.stopPrint',
  'Select File':       'print.selectFile',
  'Upload File':       'print.uploadFile',
  'Refresh File List': 'print.refreshFileList',
  'Set E0 Temp':       'temperature.setE0',
  'Set E1 Temp':       'temperature.setE1',
  'Set E2 Temp':       'temperature.setE2',
  'Set Bed Temp':      'temperature.setBed',
  'Cooldown':          'temperature.cooldown',
  'Home All Axes':     'movement.homeAllAxes',
}
function tLabel(label) {
  return CMD_LABEL_KEYS[label] ? t(CMD_LABEL_KEYS[label]) : label
}

const props = defineProps({
  groups: { type: Array, default: () => [] }
})

/** Gcode autocomplete width handler */
const gcodeAutocomplete = ref(null)

function onGcodeMenuChange(isOpen) {
  if (!isOpen) return
  
  // When menu opens, force the content width
  setTimeout(() => {
    const menu = document.querySelector('.gcode-menu-content')
    if (menu) {
      menu.style.width = '560px'
      menu.style.minWidth = '560px'
      menu.style.maxWidth = '560px'
      console.log('[GcodeMenu] Set menu width to 560px')
    }
  }, 10)
}

/** Movement helpers */
function isStepButton(cmd) { return typeof cmd?.stepSize === 'number' }
function isStepActive(cmd) { return isStepButton(cmd) && selectedStepSize.value === cmd.stepSize }
function movementBtnColor(cmd) {
  if (isStepButton(cmd)) return isStepActive(cmd) ? 'primary' : 'grey'
  return cmd.color ?? 'grey'
}
function movementBtnVariant(cmd) {
  if (isStepButton(cmd)) return isStepActive(cmd) ? 'elevated' : 'tonal'
  return cmd.variant ?? 'outlined'
}
function stepCommands(commands) { return (commands || []).filter(c => typeof c?.stepSize === 'number') }
function gridCommands(commands) {
  return (commands || [])
    .filter(c => Array.isArray(c?.gridPos))
    .slice()
    .sort((a, b) => (a.gridPos[0] - b.gridPos[0]) || (a.gridPos[1] - b.gridPos[1]))
}
function zUpCommand(commands) { return (commands || []).find(c => c?.zRole === 'up') }
function zDownCommand(commands) { return (commands || []).find(c => c?.zRole === 'down') }

/** Print helpers */
function printControlCommands(commands) {
  return (commands || []).filter(c => c?.ui === 'print-controls' && c.type === 'button')
}
function printSelectCommand(commands) {
  return (commands || []).find(c => c.type === 'dropdown' && c.label === 'Select File')
}
function printUploadCommand(commands) {
  return (commands || []).find(c => c.type === 'file-upload' && c.label === 'Upload File')
}
function printRefreshCommand(commands) {
  return (commands || []).find(c => c.type === 'button' && c.label === 'Refresh File List')
}
function shortLabel(label) {
  if (label === 'Start Print') return t('print.start')
  if (label === 'Pause Print') return t('print.pause')
  if (label === 'Stop Print') return t('print.stop')
  return label
}

/** Temperature helpers */
const tempValues = ref({})

function tempCommands(commands) {
  return (commands || []).filter(c => c.type === 'number')
}

function tempActionCommands(commands) {
  return (commands || []).filter(c => c.type === 'button')
}

function setTemperature(cmd) {
  const raw = tempValues.value?.[cmd.label]
  const fallback = typeof cmd.default === 'number' ? cmd.default : undefined
  const value = raw === '' || raw === undefined || raw === null ? fallback : raw
  if (value === undefined) return
  runCommand(cmd, value)
}

function seedTemperatureValues(groups) {
  const next = { ...tempValues.value }
  ;(groups || []).forEach(group => {
    if (group?.title !== 'Temperature') return
    ;(group.commands || []).forEach(cmd => {
      if (cmd?.type !== 'number') return
      if (next[cmd.label] === undefined) {
        next[cmd.label] = cmd.default ?? ''
      }
    })
  })
  tempValues.value = next
}

/** Sidebar width & collapse */
const sidebarWidth = ref(320)
const isCollapsed = ref(localStorage.getItem('sidebarLeftCollapsed') === 'true')
let isResizing = false
let lastWidth = sidebarWidth.value

const gcodeInputs = ref({})

/** Upload UX */
const pendingFiles = ref({})
const uploadState = ref({})

function normalizeFile(val) {
  if (!val) return null
  if (val instanceof File) return val
  if (Array.isArray(val)) return val[0] instanceof File ? val[0] : null
  const maybeFiles = val?.target?.files
  if (maybeFiles && maybeFiles.length && maybeFiles[0] instanceof File) return maybeFiles[0]
  return null
}
function onFilePicked(gIdx, val) {
  const file = normalizeFile(val)
  pendingFiles.value[gIdx] = file
  uploadState.value[gIdx] = file
    ? { loading: false, ok: undefined, msg: t('print.readyUpload', { filename: file.name }) }
    : { loading: false, ok: undefined, msg: '' }
}
async function uploadPickedFile(cmd, gIdx) {
  const file = pendingFiles.value[gIdx]
  if (!file) return

  uploadState.value[gIdx] = { loading: true, ok: undefined, msg: t('print.uploading', { filename: file.name }) }

  try {
    const result = await runCommand(cmd, file)
    if (result?.ok) {
      uploadState.value[gIdx] = { loading: false, ok: true, msg: t('print.uploadSuccessful', { success: result.success, total: result.total }) }
    } else {
      uploadState.value[gIdx] = { loading: false, ok: false, msg: t('print.uploadIncomplete', { success: result?.success ?? 0, total: result?.total ?? 0 }) }
    }
  } catch (e) {
    uploadState.value[gIdx] = { loading: false, ok: false, msg: t('print.uploadFailed', { filename: file?.name ?? '' }) }
  }
}

/** Terminal */
const terminalText = ref({})

const printGroupCommands = computed(() => {
  return props.groups.find(g => g.title === 'Print')?.commands || []
})

function findTerminalCommand(commands) {
  return (commands || []).find(c => c.type === 'gcode-input' && c.label === 'G-code Terminal')
}
async function sendTerminal(gIdx, commands) {
  const cmd = findTerminalCommand(commands)
  const text = terminalText.value[gIdx]
  if (!cmd || !text || !text.trim()) return
  await runCommand(cmd, text.trim())
  terminalText.value[gIdx] = ''
}

/** Resize handlers */
function startResize() {
  isResizing = true
  if (isCollapsed.value) {
    isCollapsed.value = false
    sidebarWidth.value = lastWidth || 300
  }
}
function handleMouseMove(e) {
  if (!isResizing) return
  const next = Math.max(220, Math.min(e.clientX, 700))
  sidebarWidth.value = next
  lastWidth = next
}
function stopResize() { isResizing = false }

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', stopResize)
  
  // Load gcode file list on mount
  console.log('[Sidebar] Component mounted, loading gcode files with CIDR:', scannerCidr.value)
  refreshFileListFromBackend(scannerCidr.value).then(() => {
    console.log('[Sidebar] Gcode files loaded:', gcodeFiles.value)
  }).catch(err => {
    console.error('[Sidebar] Error loading gcode files:', err)
  })

  seedTemperatureValues(props.groups)
})
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', stopResize)
})

function toggleCollapse() {
  if (isCollapsed.value) {
    sidebarWidth.value = lastWidth || 300
    isCollapsed.value = false
  } else {
    lastWidth = sidebarWidth.value
    isCollapsed.value = true
  }
  localStorage.setItem('sidebarLeftCollapsed', String(isCollapsed.value))
}
</script>

<style scoped>
.pm-shell{ position: relative; height: 100%; overflow: visible; }

/* Sidebar surface is fully clipped when collapsed. */
.sidebar-container{
  position: relative;
  height: 100%;
  overflow: hidden;
  transition: width 160ms ease; /* ✅ same as right rail */

  background: var(--helm-nav);
}

.pm-drawer{
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--helm-nav);
  border-right: 1px solid var(--helm-border);
}

/* Header base */
.sidebar-header{
  height: 48px;
  background: var(--helm-nav);
  border-bottom: 1px solid var(--helm-border);
  display:flex;
  align-items:center;
  justify-content:center;
  flex: 0 0 auto;
}

/* Mirror header layout */
.header-content{
  width: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 0 10px;
}

.header-content-mirror{
  justify-content: space-between;
  padding: 0 8px 0 10px;
  gap: 8px;
}

.header-title{
  width: 100%;
  text-align:center;
  font-weight: 600;
  font-size: 13px;
  line-height: 30px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--helm-muted);
  position: relative;
}

.header-title-right{
  width: auto;
  flex: 1 1 auto;
  text-align: right;
  opacity: 0.95;
}

.header-title-right::after{
  display: none;
}

.header-close{ opacity: 0.85; }
.header-close:hover{ opacity: 1; }

.drawer-body{
  flex: 1 1 auto;
  overflow: auto;
  padding: 16px 12px;
  position: relative;
}

.drawer-body :deep(.sidebar-panels){
  position: relative;
  z-index: 2;
  gap: 10px;
}

.drawer-body :deep(.sidebar-panel){
  border-radius: var(--helm-radius);
  overflow: hidden;
  background: var(--helm-surface);
  border: 1px solid var(--helm-border);
  box-shadow: none;
  transition: border-color 140ms ease;
}

.drawer-body :deep(.sidebar-panel:hover){
  border-color: var(--helm-border-strong);
}

.drawer-body :deep(.sidebar-panel-title){
  background: var(--helm-raised);
  border-bottom: 1px solid var(--helm-border);
  min-height: 44px;
}

.drawer-body :deep(.v-expansion-panel--active > .v-expansion-panel-title){
  box-shadow: inset 2px 0 0 var(--helm-brand);
}

.drawer-body :deep(.sidebar-panel-text){
  padding-top: 10px;
}

/* Inputs normalize */
.sidebar-input :deep(.v-field){
  background: var(--helm-nav);
  border-radius: var(--helm-radius-sm);
}
.sidebar-input :deep(.v-label){ opacity: 0.80; }
.sidebar-input :deep(.v-field__input),
.sidebar-input :deep(textarea){ font-size: 12.5px; }

/* Gcode autocomplete: ellipsis for long names */
:deep(.gcode-menu-content .v-list-item) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Resizer */
.resizer{
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;              /* keep nice wide drag zone */
  height: 100%;
  cursor: col-resize;
  z-index: 50;

  /* 👇 invisible by default */
  background: transparent;
  border: none;
}
.resizer:hover{
  background: var(--helm-brand-dim);
  box-shadow: -1px 0 0 var(--helm-brand) inset;
}

/* Overlay the content edge without reserving layout width. */
.rail-toggle{
  position: absolute;
  top: 0;
  left: 0;
  z-index: 50;
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 6px;
  background: var(--helm-raised);
  border: 1px solid var(--helm-border-strong);
  box-shadow: none;
  overflow: hidden;
}

/* Yellow accent bar on RIGHT for LEFT sidebar (mirror of right rail toggle) */
.rail-toggle.yellow-accent::after{
  content:"";
  position:absolute;
  top:0;
  right:0;
  width: 3px;
  height: 100%;
  background: var(--helm-brand);
  opacity: 0.9;
}

/* Movement + Print styles (unchanged) */
.movement-wrap{
  --move-btn-h: 48px;
  --move-gap: 8px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}
.step-row{ display:flex; gap: 8px; }
.step-btn{ flex: 1; min-width: 0; }
.move-two-col{
  display: grid;
  grid-template-columns: 1fr 0.25fr;
  gap: 10px;
  align-items: start;
}
.movement-grid{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, var(--move-btn-h));
  gap: var(--move-gap);
  margin-bottom: 12px;
}
.movement-btn{
  min-width: 0;
  min-height: var(--move-btn-h);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
}
.z-col{ height: calc(var(--move-btn-h) * 3 + var(--move-gap) * 2); }
.z-stack{ height: 100%; display: flex; flex-direction: column; }
.z-tall{ flex: 1; min-height: 0; width: 100%; border-radius: 0; }
.z-top{ border-top-left-radius: 10px; border-top-right-radius: 10px; }
.z-bottom{
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  border-top: 1px solid rgba(255,255,255,0.18);
}
.step-active{
  outline: 2px solid rgba(255, 255, 255, 0.22);
  outline-offset: 2px;
}

.print-wrap{ display: flex; flex-direction: column; gap: 12px; }
.print-controls{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.print-control-btn{
  min-width: 0;
  height: 42px;
  border-radius: var(--helm-radius-sm);
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: none;
  box-shadow: none;
  border: 1px solid var(--helm-border-strong);
  transition: border-color 120ms ease;
}

.print-control-btn:hover{
  border-color: var(--helm-muted);
}

.print-control-btn :deep(.v-btn__content){
  gap: 6px;
  font-size: 12.5px;
}

.print-control-btn :deep(.v-icon){
  font-size: 18px !important;
}
.print-row{ display: flex; align-items: center; gap: 8px; }
.grow{ flex: 1; min-width: 0; }
.icon-btn{ width: 40px; height: 40px; border-radius: 12px; }
.print-upload{ display: flex; flex-direction: column; gap: 8px; }
.upload-status{ font-size: 12px; line-height: 1.2; opacity: 0.9; }
.upload-status.ok{ color: #7CFFB2; }
.upload-status.bad{ color: #FF8A8A; }
.terminal-wrap{
  border: 1px solid var(--helm-border);
  background: var(--helm-nav);
  border-radius: var(--helm-radius);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.terminal-title{
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  opacity: 0.9;
}
.terminal-box :deep(textarea){
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  font-size: 12px;
  line-height: 1.35;
}
.terminal-actions{ display: flex; justify-content: flex-end; gap: 8px; }
.terminal-send{ min-width: 92px; border-radius: 12px; }

.temp-wrap{ display: flex; flex-direction: column; gap: 10px; }
.temp-row{ display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; }
.temp-input{ min-width: 0; }
.temp-set-btn{ height: 40px; min-width: 64px; border-radius: 12px; }
.temp-cooldown-btn{ border-radius: 12px; text-transform: none; }
</style>
