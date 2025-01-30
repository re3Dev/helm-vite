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
          color="background"
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

/* 
  Align items side by side: a title and a collapse button.
  You can style these further or use a <v-toolbar> 
*/
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
  background-color: #393B3E;
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
  width: 2px;
  height: calc(100%);
  cursor: col-resize;
  background-color: #BCBEC0;
  z-index: 9999;
}

/* Optionally style the collapse button. 
   For example, you can give it a small margin, or change its color. 
*/
.collapse-btn {
  margin-right: -35px;
  opacity: 100;
}
</style>
