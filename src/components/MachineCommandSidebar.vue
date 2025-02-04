<template>
  <div class="sidebar-wrapper" :style="{ width: sidebarWidth + 'px' }">
    <v-navigation-drawer class="drawer-content">
      <v-expansion-panels multiple>
        <v-expansion-panel
          v-for="(group, gIdx) in groups"
          :key="gIdx"
        >
          <v-expansion-panel-title>
            {{ group.title }}
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-list>
              <v-list-item
                v-for="(cmd, cIdx) in group.commands"
                :key="cIdx"
                @click="runCommand(cmd)"
              >
                <v-list-item-title>{{ cmd }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-navigation-drawer>

    <div class="resizer" @mousedown.stop.prevent="startResize"></div>
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
const sidebarWidth = ref(200)
let isResizing = false

// Remember the last expanded width before collapse
let lastWidth = sidebarWidth.value
const isCollapsed = ref(false)

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
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #ccc;
  top: 0;
}



.sidebar-title {
  font-weight: bold;
  background-color: 'surface';
}

.drawer-content {
  transform: none !important;
  position: relative !important;
  width: 100%;
  background: rgba(97, 97, 97, 0.3);
  margin: 8px 0;
  top: 0 !important;
}

/* Ensure sidebar stays in place */
.v-navigation-drawer--mobile {
  transform: none !important;
  position: relative !important;
}

/* The resizer handle is placed on the right edge
   below the header (so it doesn't overlap the top bar) */
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

/* Optionally style the collapse button. 
   For example, you can give it a small margin, or change its color. 
*/

</style>
