<template>
  <div
    class="sidebar-wrapper"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <!-- 1) A Title Bar / Header at the top of the sidebar -->
    <div class="sidebar-header" style="text-align: center;">
      Printer Management
      <div class="header-content">
        <!-- Your Sidebar Title -->
        <span class="sidebar-title"></span>

        <!-- A button to collapse the sidebar -->
        <v-btn
          size="x-small"
          icon="mdi-plus"
          class="collapse-btn"
          @click="toggleCollapse"
          color="#181B20"
        >
          <v-icon color="primary">
            {{ isCollapsed ? 'mdi-plus' : 'mdi-plus' }}
          </v-icon>
        </v-btn>
      </div>
    </div>

    <!-- 2) The main drawer content (below the header) -->
    <v-navigation-drawer
      style="width: 100%; border-right: 1px solid #ccc;"
      class="drawer-content"
    >
      <v-expansion-panels multiple>
        <v-expansion-panel
          v-for="(group, gIdx) in groups"
          :key="gIdx"
        >
          <v-expansion-panel-title>
            <v-icon color="yellow">{{ group.icon }}</v-icon>&nbsp;
            {{ group.title }}
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- MOVEMENT -->
            <template v-if="group.title === 'Movement'">
              <div class="movement-wrap">
                <!-- Step size row -->
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

                <!-- XY grid + Z column -->
                <div class="move-two-col">
                  <!-- XY 3x3 -->
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

                  <!-- Z (two tall buttons, split full height of XY grid) -->
                  <div class="z-col">
                    <div class="z-stack">
                      <v-btn
                        v-if="zUpCommand(group.commands)"
                        :color="movementBtnColor(zUpCommand(group.commands))"
                        :variant="movementBtnVariant(zUpCommand(group.commands))"
                        class="z-tall z-top"
                        @click="runCommand(zUpCommand(group.commands))"
                      >
                        <v-icon v-if="zUpCommand(group.commands)?.icon">{{ zUpCommand(group.commands).icon }}</v-icon>
                        <span v-else>{{ zUpCommand(group.commands)?.label }}</span>
                      </v-btn>

                      <v-btn
                        v-if="zDownCommand(group.commands)"
                        :color="movementBtnColor(zDownCommand(group.commands))"
                        :variant="movementBtnVariant(zDownCommand(group.commands))"
                        class="z-tall z-bottom"
                        @click="runCommand(zDownCommand(group.commands))"
                      >
                        <v-icon v-if="zDownCommand(group.commands)?.icon">{{ zDownCommand(group.commands).icon }}</v-icon>
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
                <v-list-item
                  v-for="(cmd, cIdx) in group.commands"
                  :key="cIdx"
                >
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
                    ></v-text-field>
                  </template>

                  <template v-else-if="cmd.type === 'file-upload'">
                    <v-file-input
                      :label="cmd.label"
                      :accept="cmd.accept?.join(',')"
                      :color="cmd.color"
                      prepend-icon="mdi-upload"
                      class="file-upload-input"
                      @change="file => runCommand(cmd, file)"
                    ></v-file-input>
                  </template>

                  <template v-else-if="cmd.type === 'dropdown'">
                    <v-select
                      :label="cmd.label"
                      :items="cmd.options"
                      @change="value => runCommand(cmd, value)"
                    ></v-select>
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
    </v-navigation-drawer>

    <!-- 3) The draggable resizer handle on the right edge -->
    <div
      class="resizer"
      @mousedown.stop.prevent="startResize"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, defineProps } from 'vue'
import { runCommand, selectedStepSize } from './commandService.ts'

const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
})

/**
 * Step-button highlight helpers (Movement group only)
 * A step button is any command with stepSize set.
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
 * - step buttons: have stepSize
 * - XY grid buttons: have gridPos
 * - Z buttons: move.axis === 'Z' and dir +/- 1
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
  return (commands || []).find(c => c?.move?.axis === 'Z' && (c?.move?.dir === 1 || c?.label === 'Z+'))
}

function zDownCommand(commands) {
  return (commands || []).find(c => c?.move?.axis === 'Z' && (c?.move?.dir === -1 || c?.label === 'Z-'))
}

/**
 * Sidebar width & collapse logic
 */
const sidebarWidth = ref(300)
let isResizing = false

// Remember the last expanded width before collapse
let lastWidth = sidebarWidth.value
const isCollapsed = ref(false)

// G-code input tracking per group
const gcodeInputs = ref({})

// Start drag
function startResize() {
  isResizing = true
  // If user starts to drag, un-collapse it
  if (isCollapsed.value) {
    isCollapsed.value = false
  }
}

function handleMouseMove(e) {
  if (!isResizing) return
  sidebarWidth.value = e.clientX
  lastWidth = sidebarWidth.value
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
  // If currently collapsed, restore lastWidth
  if (isCollapsed.value) {
    sidebarWidth.value = lastWidth
    isCollapsed.value = false
  } else {
    // Store current width and collapse
    lastWidth = sidebarWidth.value
    sidebarWidth.value = 0 // or 0, or any minimal width
    isCollapsed.value = true
  }
}
</script>

<style scoped>
/* A flex container, stacked vertically:
   - Header at the top
   - Drawer content below
   - Resizer at the right edge
*/
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');

/* Apply Lato font to all elements */
* {
  font-family: 'Lato', sans-serif !important;
}

.sidebar-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/*
  The top bar (title row).
*/
.sidebar-header {
  height: 30px;
  background-color: #333131;
  border-bottom: 1px solid #ccc;
  z-index: 1;
}

.header-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 0px;
  justify-content: space-between;
}

.sidebar-title {
  font-weight: bold;
  background-color: 'surface';
}

.drawer-content {
  transform: none !important;
  position: relative !important;
  width: 100%;
  background-color: #242527;
  top: 0 !important;
}

/* Ensure sidebar stays in place */
.v-navigation-drawer--mobile {
  transform: none !important;
  position: relative !important;
}

.resizer {
  position: absolute;
  top: 0px;
  right: 0;
  width: 5px;
  height: calc(100%);
  cursor: col-resize;
  background-color: #1d1d1d;
  z-index: 9999;
}

.collapse-btn {
  margin-right: -35px;
  opacity: 100;
}

/* Movement layout + sizing tokens so XY + Z match perfectly */
.movement-wrap{
  --move-btn-h: 48px;
  --move-gap: 8px;
  display:flex;
  flex-direction:column;
  gap: 10px;
}

/* Step row */
.step-row{
  display:flex;
  gap: 8px;
}
.step-btn{
  flex: 1;
  min-width: 0;
}

/* Two-column layout: XY grid + Z column */
.move-two-col{
  display: grid;
  grid-template-columns: 1fr 0.25fr;
  gap: 10px;
  align-items: start;
}

/* XY 3x3 grid */
.movement-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, var(--move-btn-h));
  gap: var(--move-gap);
  margin-bottom: 12px;
}

.movement-btn {
  min-width: 0;
  min-height: var(--move-btn-h);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
}

/* Z column: match total height of XY grid (3 rows + 2 gaps) */
.z-col{
  height: calc(var(--move-btn-h) * 3 + var(--move-gap) * 2);
}

.z-stack{
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Two tall buttons that split the full height */
.z-tall{
  flex: 1;
  min-height: 0;
  width: 100%;
  border-radius: 0; /* make them look like a single tall control */
}

/* rounded ends so it looks intentional */
.z-top{
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
}
.z-bottom{
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  border-top: 1px solid rgba(255,255,255,0.18); /* subtle divider */
}

/* Active ring for selected step size */
.step-active {
  outline: 2px solid rgba(255, 255, 255, 0.25);
  outline-offset: 2px;
}
</style>
