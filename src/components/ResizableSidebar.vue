<template>
    <!-- 1) This .sidebar-wrapper controls the sidebar's overall width -->
    <div
      class="sidebar-wrapper"
      :style="{ width: sidebarWidth + 'px' }"
    >
      <!-- 2) Let the drawer fill the wrapper. 
           No :width="..." on the drawer; just width: 100%. -->
      <v-navigation-drawer
        v-model="drawer"
        :permanent="permanent"
        color="grey lighten-4"
        style="width: 100%; border-right: 1px solid #ccc;"
      >
        <!-- Example content in the drawer -->
        <v-toolbar flat>
          <v-toolbar-title>Resizable Sidebar</v-toolbar-title>
        </v-toolbar>
  
        <v-divider></v-divider>
  
        <v-list dense>
          <v-list-item
            v-for="(item, i) in items"
            :key="i"
            link
            @click="navigate(item.to)"
          >
            <v-list-item-icon>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-item-icon>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
  
        <div class="px-3 mt-auto">
          <v-btn block color="primary" class="mb-2">
            Save
          </v-btn>
          <v-btn block color="secondary">
            Cancel
          </v-btn>
        </div>
      </v-navigation-drawer>
  
      <!-- 3) The draggable handle. Position it on the right edge. -->
      <div
        class="resizer"
        @mousedown.stop="startResize"
      ></div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  
  /**
   * Props
   *  - permanent: controls whether the drawer can be toggled 
   *    or is always shown (like a typical pinned sidebar).
   */
  const props = defineProps({
    permanent: {
      type: Boolean,
      default: true
    }
  })
  
  const drawer = ref(true)          // Whether the drawer is open
  const sidebarWidth = ref(300)     // Initial sidebar width in px
  let isResizing = false
  
  const router = useRouter()
  const items = ref([
    { title: 'Home', icon: 'mdi-home', to: '/' },
    { title: 'Settings', icon: 'mdi-cog', to: '/settings' },
    { title: 'Printers', icon: 'mdi-printer', to: '/printers' },
    { title: 'About', icon: 'mdi-information', to: '/about' }
  ])
  
  function navigate(path) {
    router.push(path)
  }
  
  /** 
   * Handle resizing logic
   */
  function startResize() {
    isResizing = true
  }
  
  function handleMouseMove(e) {
    if (!isResizing) return
    // e.clientX is the mouse’s distance from the left edge
    // Use that to set the sidebar width
    let newWidth = e.clientX
  
    // (Optional) Add min/max constraints
    const MIN = 200
    const MAX = 600
    if (newWidth < MIN) newWidth = MIN
    if (newWidth > MAX) newWidth = MAX
  
    sidebarWidth.value = newWidth
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
  </script>
  
  <style scoped>
.sidebar-wrapper {
  position: relative; 
  display: flex;
}

.v-navigation-drawer {
  position: relative;
  z-index: 1;
}

/* The resizer has a higher z-index so it sits on top */
.resizer {
  position: absolute;
  top: 0;
  right: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background-color: red;  /* for debugging */
  z-index: 9999;          /* ensure highest stacking */
}

  </style>
  