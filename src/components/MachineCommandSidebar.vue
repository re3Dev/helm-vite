<template>
  <div class="pm-shell">
    <!-- Reserves layout space -->
    <div class="sidebar-container" :style="{ width: sidebarWidth + 'px' }">
      <!-- Custom “drawer” -->
      <div v-show="!isCollapsed" class="pm-drawer">
        <!-- Header -->
        <div class="sidebar-header">
          <div class="header-content">
            <div class="header-title">Printer Management</div>
          </div>
        </div>

        <!-- Body -->
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

                <!-- EVERYTHING ELSE -->
                <template v-else>
                  <v-list>
                    <v-list-item v-for="(cmd, cIdx) in group.commands" :key="cIdx">
                      <template v-if="cmd.type === 'button'">
                        <v-btn
                          block
                          @click="runCommand(cmd)"
                          :color="cmd.color"
                          :variant="cmd.variant"
                        >
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

                      <template v-else-if="cmd.type === 'file-upload'">
                        <v-file-input
                          :label="cmd.label"
                          :accept="cmd.accept?.join(',')"
                          :color="cmd.color"
                          prepend-icon="mdi-upload"
                          class="file-upload-input"
                          @change="file => runCommand(cmd, file)"
                        />
                      </template>

                      <template v-else-if="cmd.type === 'dropdown'">
                        <v-select
                          :label="cmd.label"
                          :items="cmd.options"
                          @change="value => runCommand(cmd, value)"
                        />
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

      <!-- Resizer -->
      <div
        v-if="!isCollapsed"
        class="resizer"
        @mousedown.stop.prevent="startResize"
      ></div>
    </div>

    <!-- Toggle button: top-right outside sidebar, but clamped so it never clips off-screen -->
    <v-btn
      class="edge-toggle top-right"
      size="x-small"
      icon
      :style="{ left: toggleLeft + 'px' }"
      @click="toggleCollapse"
      color="#181B20"
    >
      <v-icon color="primary">
        {{ isCollapsed ? 'mdi-plus' : 'mdi-minus' }}
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

/**
 * Step-button highlight helpers (Movement group only)
 */
function isStepButton(cmd) {
  return typeof cmd?.stepSize === 'number'
}
function isStepActive(cmd) {
  return isStepButton(cmd) && selectedStepSize.value === cmd.stepSize
}
function movementBtnColor(cmd) {
  if (isStepButton(cmd)) return isStepActive(cmd) ? 'primary' : 'grey'
  return cmd.color ?? 'grey'
}
function movementBtnVariant(cmd) {
  if (isStepButton(cmd)) return isStepActive(cmd) ? 'elevated' : 'tonal'
  return cmd.variant ?? 'outlined'
}

/**
 * Movement command selectors
 */
function stepCommands(commands) {
  return (commands || []).filter(c => typeof c?.stepSize === 'number')
}

function gridCommands(commands) {
  return (commands || [])
    .filter(c => Array.isArray(c?.gridPos))
    .slice()
    .sort((a, b) => (a.gridPos[0] - b.gridPos[0]) || (a.gridPos[1] - b.gridPos[1]))
}

function zUpCommand(commands) {
  return (commands || []).find(c => c?.zRole === 'up')
}
function zDownCommand(commands) {
  return (commands || []).find(c => c?.zRole === 'down')
}

/**
 * Sidebar width & collapse logic
 */
const sidebarWidth = ref(300)
const isCollapsed = ref(false)

let isResizing = false
let lastWidth = sidebarWidth.value

// G-code input tracking per group
const gcodeInputs = ref({})

/**
 * Button x anchor (sidebar boundary).
 * When collapsed, sidebarWidth is 0; we clamp to keep the button visible.
 */
const EDGE_BTN_MIN_LEFT = 10 // px from left edge of screen

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

function stopResize() {
  isResizing = false
}

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

* {
  font-family: 'Lato', sans-serif !important;
}

.pm-shell{
  position: relative;
  height: 100%;
  overflow: visible; /* IMPORTANT: allow the button to sit outside the sidebar */
}

/* Reserves layout space */
.sidebar-container{
  position: relative;
  height: 100%;
}

/* Custom drawer fills the reserved area */
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

.drawer-body{
  flex: 1 1 auto;
  overflow: auto;
  padding: 0;
}

/* Resizer */
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

/* Toggle button anchored at the boundary */
.edge-toggle{
  position: absolute;
  z-index: 9999;
  border-radius: 999px;
}

/* Top-right outside sidebar.
   When collapsed, left is clamped to >= 10px, so translateX(50%) won't clip off-screen. */
.edge-toggle.top-right{
  top: 6px;
  transform: translateX(50%);
}

/* Movement layout + sizing tokens so XY + Z match perfectly */
.movement-wrap{
  --move-btn-h: 48px;
  --move-gap: 8px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}

.step-row{
  display:flex;
  gap: 8px;
}
.step-btn{
  flex: 1;
  min-width: 0;
}

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

.z-col{
  height: calc(var(--move-btn-h) * 3 + var(--move-gap) * 2);
}

.z-stack{
  height: 100%;
  display: flex;
  flex-direction: column;
}

.z-tall{
  flex: 1;
  min-height: 0;
  width: 100%;
  border-radius: 0;
}

.z-top{
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
}
.z-bottom{
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  border-top: 1px solid rgba(255,255,255,0.18);
}

.step-active{
  outline: 2px solid rgba(255, 255, 255, 0.25);
  outline-offset: 2px;
}
</style>
