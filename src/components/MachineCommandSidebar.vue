<template>
  <div class="pm-shell">
    <!-- ✅ width mirrors right rail behavior: collapsed -> collapsedWidth, open -> sidebarWidth -->
    <div
      class="sidebar-container"
      :style="{ width: isCollapsed ? collapsedWidth + 'px' : sidebarWidth + 'px' }"
    >
      <div v-show="!isCollapsed" class="pm-drawer">
        <!-- ✅ Header: mirror of right rail (arrow far LEFT, title on RIGHT) -->
        <div class="sidebar-header fancy">
          <div class="header-content header-content-mirror">
            <v-btn
              icon
              variant="text"
              size="small"
              class="header-close header-close-left"
              @click="toggleCollapse"
              title="Collapse printer control"
            >
              <v-icon>mdi-chevron-left</v-icon>
            </v-btn>

            <div class="header-title header-title-right">Printer Control</div>
          </div>
        </div>

        <!-- Body (unchanged; keeps Movement formatting correct) -->
        <div class="drawer-body">
          <v-expansion-panels multiple class="sidebar-panels">
            <v-expansion-panel v-for="(group, gIdx) in groups" :key="gIdx" class="sidebar-panel">
              <v-expansion-panel-title class="sidebar-panel-title">
                <v-icon color="yellow">{{ group.icon }}</v-icon>&nbsp;
                {{ group.title }}
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
                          :label="printSelectCommand(group.commands).label"
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
                        :label="printUploadCommand(group.commands).label"
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
                        color="yellow"
                        variant="tonal"
                        :disabled="!pendingFiles[gIdx] || uploadState[gIdx]?.loading"
                        :loading="uploadState[gIdx]?.loading"
                        @click="uploadPickedFile(printUploadCommand(group.commands), gIdx)"
                        class="primary-action"
                      >
                        <v-icon start>mdi-cloud-upload</v-icon>
                        Upload
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
                        :label="cmd.label"
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
                        color="yellow"
                        variant="tonal"
                        @click="setTemperature(cmd)"
                      >
                        Set
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
                      {{ cmd.label }}
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
                          Send
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
                <v-icon color="yellow">mdi-console</v-icon>&nbsp;
                G-code Terminal
              </v-expansion-panel-title>

              <v-expansion-panel-text class="sidebar-panel-text">
                <div class="terminal-wrap">
                  <v-textarea
                    v-model="terminalText['_standalone']"
                    auto-grow
                    rows="3"
                    max-rows="8"
                    density="compact"
                    placeholder="Enter G-code (e.g. M105, M119, G28, PAUSE)"
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
                      Send
                    </v-btn>

                    <v-btn
                      class="terminal-clear"
                      size="small"
                      color="grey"
                      variant="text"
                      @click="terminalText['_standalone'] = ''"
                    >
                      Clear
                    </v-btn>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>

            <!-- Settings Panel -->
            <v-expansion-panel class="sidebar-panel">
              <v-expansion-panel-title class="sidebar-panel-title">
                <v-icon color="yellow">mdi-cog</v-icon>&nbsp;
                Settings
              </v-expansion-panel-title>

              <v-expansion-panel-text class="sidebar-panel-text">
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div>
                    <label style="display: block; font-size: 12px; opacity: 0.8; margin-bottom: 4px">Scanner CIDR</label>
                    <div style="display: flex; gap: 6px;">
                      <v-text-field
                        v-model="printerCidr"
                        placeholder="192.168.1.0/24"
                        hide-details
                        density="compact"
                        class="sidebar-input"
                        style="flex: 1"
                      />
                      <v-btn
                        icon
                        small
                        color="yellow"
                        variant="tonal"
                        @click="saveCidrSettings"
                        title="Save and scan"
                      >
                        <v-icon>mdi-check</v-icon>
                      </v-btn>
                    </div>
                    <div style="font-size: 11px; opacity: 0.6; margin-top: 4px;">Enter CIDR notation (e.g., 192.168.1.0/24)</div>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </div>

      <div v-if="!isCollapsed" class="resizer" @mousedown.stop.prevent="startResize"></div>

      <!-- ✅ Edge toggle when collapsed (lives inside the collapsed strip now) -->
      <v-btn
        v-if="isCollapsed"
        class="rail-toggle square yellow-accent"
        icon
        @click="toggleCollapse"
        title="Open printer control"
      >
        <v-icon>mdi-chevron-right</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineProps } from 'vue'
import { runCommand, selectedStepSize, refreshFileListFromBackend, gcodeFiles, scannerCidr, selectedPrintFile } from './commandService.ts'

const props = defineProps({
  groups: { type: Array, default: () => [] }
})

/** ✅ Match right rail behavior */
const collapsedWidth = 38

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

/** Settings: Printer Scanner CIDR */
const printerCidr = ref(scannerCidr.value)

function saveCidrSettings() {
  const trimmed = printerCidr.value.trim()
  if (!trimmed) {
    console.warn('CIDR cannot be empty')
    return
  }
  
  console.log('[Settings] Saving CIDR:', trimmed)
  
  // Save to store
  scannerCidr.value = trimmed
  console.log('[Settings] Updated scannerCidr.value to:', scannerCidr.value)
  
  // Save to localStorage
  localStorage.setItem('printerScannerCidr', trimmed)
  console.log('[Settings] Saved to localStorage:', localStorage.getItem('printerScannerCidr'))
  
  // Refresh file list with new CIDR
  console.log('[Settings] Calling refreshFileListFromBackend with:', trimmed)
  refreshFileListFromBackend(trimmed)
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
  if (label === 'Start Print') return 'Start'
  if (label === 'Pause Print') return 'Pause'
  if (label === 'Stop Print') return 'Stop'
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
const isCollapsed = ref(false)
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
    ? { loading: false, ok: undefined, msg: `Ready: ${file.name}` }
    : { loading: false, ok: undefined, msg: '' }
}
async function uploadPickedFile(cmd, gIdx) {
  const file = pendingFiles.value[gIdx]
  if (!file) return

  uploadState.value[gIdx] = { loading: true, ok: undefined, msg: 'Uploading…' }

  try {
    const result = await runCommand(cmd, file)
    if (result?.ok) {
      uploadState.value[gIdx] = { loading: false, ok: true, msg: `Upload successful (${result.success}/${result.total})` }
    } else {
      uploadState.value[gIdx] = { loading: false, ok: false, msg: `Upload incomplete (${result?.success ?? 0}/${result?.total ?? 0})` }
    }
  } catch (e) {
    uploadState.value[gIdx] = { loading: false, ok: false, msg: `Upload failed: ${e?.message ?? e}` }
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
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');
* { font-family: 'Lato', sans-serif !important; }

.pm-shell{ position: relative; height: 100%; overflow: visible; }

/* ✅ Overall “console” region (shows when collapsed too) */
.sidebar-container{
  position: relative;
  height: 100%;
  overflow: hidden;
  transition: width 160ms ease; /* ✅ same as right rail */

  background:
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.14)),
    radial-gradient(circle at 30% 20%, rgba(255,213,74,0.08), transparent 55%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04), transparent 60%),
    #1f2022;

  box-shadow:
    0 1px 0 rgba(255,255,255,0.05) inset,
    0 -1px 0 rgba(0,0,0,0.35) inset;
}

.sidebar-container::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity: 0.16;
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255,255,255,0.05) 0px,
      rgba(255,255,255,0.05) 1px,
      transparent 1px,
      transparent 7px
    );
}

.sidebar-container::after{
  content:"";
  position:absolute;
  top:0;
  right:0;
  width: 3px;
  height: 100%;
  pointer-events:none;
  background: linear-gradient(
    180deg,
    rgba(255,213,74,0.0),
    rgba(255,213,74,0.20),
    rgba(255,213,74,0.0)
  );
  opacity: 0.70;
  filter: blur(0.4px);
  animation: containerEdgeGlow 5.2s ease-in-out infinite;
}

@keyframes containerEdgeGlow{
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 0.85; }
}

@media (prefers-reduced-motion: reduce){
  .sidebar-container::after{ animation: none !important; }
}

.pm-drawer{
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: rgba(36,37,39,0.92);
  border-right: 1px solid rgba(255,255,255,0.08);
}

/* Header base */
.sidebar-header{
  height: 30px;
  background-color: #333131;
  border-bottom: 1px solid rgba(255,255,255,0.10);
  display:flex;
  align-items:center;
  justify-content:center;
  flex: 0 0 auto;
}

.sidebar-header.fancy{
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.10)),
    #333131;
}

.sidebar-header.fancy::before{
  content:"";
  position:absolute;
  top:-40%;
  left:-60%;
  width: 160%;
  height: 200%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,213,74,0.10) 45%,
    rgba(255,213,74,0.22) 50%,
    rgba(255,213,74,0.10) 55%,
    transparent 100%
  );
  transform: rotate(8deg);
  animation: headerSheen 7.5s ease-in-out infinite;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.55;
}

.sidebar-header.fancy::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06), transparent 45%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04), transparent 55%);
  pointer-events:none;
  opacity: 0.6;
}

@keyframes headerSheen{
  0%   { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
  35%  { transform: translateX(0%)   rotate(8deg); opacity: 0.60; }
  70%  { transform: translateX(18%)  rotate(8deg); opacity: 0.35; }
  100% { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce){
  .sidebar-header.fancy::before{ animation: none !important; }
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
  font-weight: 650;
  font-size: 13.5px;
  line-height: 30px;
  letter-spacing: 0.25px;
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

/* Body glass well */
.drawer-body{
  flex: 1 1 auto;
  overflow: auto;
  padding: 10px;
  position: relative;
}

.drawer-body::before{
  content:"";
  position:absolute;
  inset: 10px;
  border-radius: 14px;
  pointer-events:none;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 18px 46px rgba(0,0,0,0.30);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.drawer-body::after{
  content:"";
  position:absolute;
  inset: 10px;
  border-radius: 14px;
  pointer-events:none;
  background:
    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.10), transparent 50%),
    radial-gradient(circle at 82% 70%, rgba(255,213,74,0.07), transparent 58%),
    linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.10));
  opacity: 0.92;
}

.drawer-body :deep(.sidebar-panels){
  position: relative;
  z-index: 2;
  gap: 10px;
}

.drawer-body :deep(.sidebar-panel){
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0,0,0,0.16);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 10px 22px rgba(0,0,0,0.25);
  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.drawer-body :deep(.sidebar-panel:hover){
  background: rgba(0,0,0,0.20);
  border-color: rgba(255,255,255,0.14);
  transform: translateY(-1px);
}

.drawer-body :deep(.sidebar-panel-title){
  background: rgba(0,0,0,0.12);
  border-bottom: 1px solid rgba(255,255,255,0.08);
  min-height: 44px;
}

.drawer-body :deep(.v-expansion-panel--active > .v-expansion-panel-title){
  box-shadow: 0 -1px 0 rgba(255,213,74,0.26) inset;
}

.drawer-body :deep(.sidebar-panel-text){
  padding-top: 10px;
}

/* Inputs normalize */
.sidebar-input :deep(.v-field){
  background: rgba(0,0,0,0.18) !important;
  border: 1px solid rgba(255,255,255,0.10) !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
}
.sidebar-input :deep(.v-field__outline){ opacity: 0 !important; }
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
  background: linear-gradient(
    180deg,
    rgba(255,213,74,0.08),
    rgba(255,213,74,0.18),
    rgba(255,213,74,0.08)
  );
  box-shadow: -1px 0 0 rgba(255,213,74,0.25) inset;
  transition: background 120ms ease, box-shadow 120ms ease;
}

/* ✅ Collapsed toggle button: visible inside collapsedWidth strip (mirror of right rail) */
.rail-toggle{
  position: absolute;
  top: 0;
  right: 4px; /* keep inside 38px strip */
  z-index: 50;
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 6px;
  background: #333131;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 10px 22px rgba(0,0,0,0.35);
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
  background: #FFD54A;
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
  border-radius: 12px;
  font-weight: 700;
  letter-spacing: 0.2px;
  text-transform: none;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.08) inset,
    0 8px 16px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.16);
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.print-control-btn:hover{
  transform: translateY(-1px);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.12) inset,
    0 10px 18px rgba(0,0,0,0.30);
  border-color: rgba(255,255,255,0.26);
}

.print-control-btn:active{
  transform: translateY(0);
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
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.14);
  border-radius: 14px;
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
