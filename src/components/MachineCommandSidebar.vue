<template>
  <div class="pm-shell">
    <div class="sidebar-container" :style="{ width: sidebarWidth + 'px' }">
      <div v-show="!isCollapsed" class="pm-drawer">
        <div class="sidebar-header">
          <div class="header-content">
            <div class="header-title">Printer Management</div>
          </div>
        </div>

        <div class="drawer-body">
          <v-expansion-panels multiple>
            <v-expansion-panel v-for="(group, gIdx) in groups" :key="gIdx">
              <v-expansion-panel-title>
                <v-icon color="yellow">{{ group.icon }}</v-icon>&nbsp;
                {{ group.title }}
              </v-expansion-panel-title>

              <v-expansion-panel-text>
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

                <!-- PRINT: neat layout -->
                <template v-else-if="group.title === 'Print'">
                  <div class="print-wrap">
                    <!-- Controls row -->
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

                    <!-- File select + refresh -->
                    <div class="print-row">
                      <div class="grow">
                        <v-select
                          v-if="printSelectCommand(group.commands)"
                          :label="printSelectCommand(group.commands).label"
                          :items="printSelectCommand(group.commands).options"
                          density="compact"
                          hide-details
                          @update:modelValue="v => runCommand(printSelectCommand(group.commands), v)"
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

                    <!-- Upload picker + upload action + status -->
                    <div class="print-upload">
                      <v-file-input
                        v-if="printUploadCommand(group.commands)"
                        :label="printUploadCommand(group.commands).label"
                        :accept="printUploadCommand(group.commands).accept?.join(',')"
                        :color="printUploadCommand(group.commands).color"
                        prepend-icon="mdi-upload"
                        density="compact"
                        hide-details
                        class="file-upload-input"
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

                    <!-- G-code terminal (clean) -->
                    <div class="terminal-wrap">
                      <div class="terminal-title">
                        <v-icon size="18">mdi-console</v-icon>
                        <span>G-code Terminal</span>
                      </div>

                      <v-textarea
                        v-model="terminalText[gIdx]"
                        auto-grow
                        rows="2"
                        max-rows="6"
                        density="compact"
                        placeholder="Enter G-code (examples: M105, M119, G28, PAUSE)"
                        hide-details
                        class="terminal-box"
                      />

                      <div class="terminal-actions">
                        <v-btn
                          class="terminal-send"
                          size="small"
                          color="grey"
                          variant="outlined"
                          :disabled="!terminalText[gIdx] || !terminalText[gIdx].trim()"
                          @click="sendTerminal(gIdx, group.commands)"
                        >
                          Send
                        </v-btn>

                        <v-btn
                          class="terminal-clear"
                          size="small"
                          color="grey"
                          variant="text"
                          @click="terminalText[gIdx] = ''"
                        >
                          Clear
                        </v-btn>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- EVERYTHING ELSE -->
                <template v-else>
                  <v-list>
                    <v-list-item v-for="(cmd, cIdx) in group.commands" :key="cIdx">
                      <template v-if="cmd.type === 'button'">
                        <v-btn block @click="runCommand(cmd)" :color="cmd.color" :variant="cmd.variant">
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
                        />
                      </template>

                      <template v-else-if="cmd.type === 'dropdown'">
                        <v-select :label="cmd.label" :items="cmd.options" @change="value => runCommand(cmd, value)" />
                      </template>

                      <template v-else-if="cmd.type === 'gcode-input'">
                        <v-text-field
                          v-model="gcodeInputs[gIdx]"
                          :label="cmd.label"
                          placeholder="Enter G-code (e.g. M119)"
                          @keyup.enter="runCommand(cmd, gcodeInputs[gIdx]); gcodeInputs[gIdx] = ''"
                          hide-details
                          dense
                          class="gcode-input-box"
                          style="width: 100%; max-width: 100%; display: block; margin-bottom: 4px;"
                        />
                        <v-btn
                          block
                          size="small"
                          color="grey"
                          variant="outlined"
                          @click="runCommand(cmd, gcodeInputs[gIdx]); gcodeInputs[gIdx] = ''"
                        >
                          Send
                        </v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </template>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </div>
      </div>

      <div v-if="!isCollapsed" class="resizer" @mousedown.stop.prevent="startResize"></div>
    </div>

<v-btn
  class="edge-toggle top-right square"
  icon
  :style="{ left: toggleLeft + 'px' }"
  @click="toggleCollapse"
  color="#333131"
>
  <v-icon size="18">
    {{ isCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}
  </v-icon>
</v-btn>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineProps } from 'vue'
import { runCommand, selectedStepSize } from './commandService.ts'

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
})

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

/** ✅ Print section helpers */
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

/** Sidebar width & collapse */
const sidebarWidth = ref(300)
const isCollapsed = ref(false)
let isResizing = false
let lastWidth = sidebarWidth.value

const gcodeInputs = ref({})

/** ✅ Upload UX state */
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

/** ✅ Terminal state (separate from old gcodeInputs) */
const terminalText = ref({})

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

/** Toggle button anchor */
const EDGE_BTN_MIN_LEFT = 10
const toggleLeft = computed(() => {
  const boundary = isCollapsed.value ? 0 : sidebarWidth.value
  return Math.max(EDGE_BTN_MIN_LEFT, boundary)
})

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
    sidebarWidth.value = 0
    isCollapsed.value = true
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');
* { font-family: 'Lato', sans-serif !important; }

.pm-shell{ position: relative; height: 100%; overflow: visible; }
.sidebar-container{ position: relative; height: 100%; }

.pm-drawer{
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: #242527;
  border-right: 1px solid #ccc;
}

.sidebar-header{
  height: 30px;
  background-color: #333131;
  border-bottom: 1px solid #ccc;
  display:flex;
  align-items:center;
  justify-content:center;
  flex: 0 0 auto;
}

.header-content{
  width: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  padding: 0 10px;
}

.header-title{
  width: 100%;
  text-align:center;
  font-weight: 600;
  font-size: 14px;
  line-height: 30px;
}

.drawer-body{ flex: 1 1 auto; overflow: auto; padding: 0; }

.resizer{
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  background-color: #1d1d1d;
  z-index: 50;
}

.edge-toggle{
  position: absolute;
  z-index: 9999;
  padding: 0;
}

/* align to your header bar */
.edge-toggle.top-right{
  top: 0;
}

/* square, same height as header */
.edge-toggle.square{
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 6px; /* still "square", but nicer */
  background: #333131;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 10px 22px rgba(0,0,0,0.35);
  transform: translateX(-1px); /* tuck into edge */
  overflow: hidden;
}

/* center icon */
.edge-toggle.square :deep(.v-btn__content){
  display:flex;
  align-items:center;
  justify-content:center;
}

/* yellow accent strip on the right edge */
.edge-toggle.square.yellow-accent::after{
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 3px;
  height: 100%;
  background: #FFD54A; /* your yellow vibe */
  opacity: 0.9;
}

/* icon defaults subtle, then pops with yellow */
.edge-toggle.square .toggle-icon{
  color: rgba(255,255,255,0.82);
}

/* hover: slightly lighter + yellow icon */
.edge-toggle.square:hover{
  background: #3b3a3a;
  border-color: rgba(255,255,255,0.14);
}
.edge-toggle.square:hover .toggle-icon{
  color: #FFD54A;
}

/* optional: when collapsed, keep icon yellow so state is obvious */
.edge-toggle.square.yellow-accent .toggle-icon{
  transition: color 120ms ease;
}



/* Movement */
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
.z-top{ border-top-left-radius: 6px; border-top-right-radius: 6px; }
.z-bottom{
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  border-top: 1px solid rgba(255,255,255,0.18);
}

.step-active{
  outline: 2px solid rgba(255, 255, 255, 0.25);
  outline-offset: 2px;
}

/* ✅ Print section layout */
.print-wrap{
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.print-controls{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.print-control-btn{
  min-width: 0;
  height: 38px;
}

.print-row{
  display: flex;
  align-items: center;
  gap: 8px;
}

.grow{ flex: 1; min-width: 0; }

.icon-btn{
  width: 40px;
  height: 40px;
}

.print-upload{
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-status{
  font-size: 12px;
  line-height: 1.2;
  opacity: 0.9;
}
.upload-status.ok{ color: #7CFFB2; }
.upload-status.bad{ color: #FF8A8A; }

/* ✅ Terminal */
.terminal-wrap{
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(0,0,0,0.14);
  border-radius: 12px;
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

.terminal-actions{
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.terminal-send{ min-width: 92px; }
</style>
