<template>
  <div
    class="sidebar-wrapper"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <!-- 1) A Title Bar / Header at the top of the sidebar -->
    <div class="sidebar-header" style="text-align: center;">Printer Management
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
        <template v-if="group.title === 'Movement'">
          <div class="movement-grid">
            <v-btn
              v-for="cmd in group.commands"
              :key="cmd.label"
              :color="cmd.color"
              :variant="cmd.variant"
              class="movement-btn"
              @click="runCommand(cmd)"
            >
              <v-icon v-if="cmd.icon">{{ cmd.icon }}</v-icon>
              <span>{{ cmd.label }}</span>
            </v-btn>
          </div>
        </template>
        <template v-else>
          <v-list>
            <v-list-item
              v-for="(cmd, cIdx) in group.commands"
              :key="cIdx"
            >
              <template v-if="cmd.type === 'button'">
                <v-btn block @click="runCommand(cmd)"
                  :color="cmd.color"
                  :variant="cmd.variant">
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
import { runCommand } from './commandService.ts'; // Import runCommand
const props = defineProps({
  groups: {
    type: Array,
    default: () => []
  }
})

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
  height: 100%; /* or adapt to your layout needs */
}

/* 
  The top bar (title row).
  We'll keep it at a fixed height (say 40px or 50px).
*/
.sidebar-header {
  height: 30px;
  background-color: #333131;
  border-bottom: 1px solid #ccc;
  z-index: 1; /* so it sits above drawer content if needed */
}

.header-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 0px; /* some horizontal padding */
  justify-content: space-between; /* space between title + button */
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
  top: 0px; /* The same as .sidebar-header height */
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

.movement-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.movement-btn {
  min-width: 0;
  min-height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 0.9em;
}
</style>
