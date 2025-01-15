<template>
    <v-navigation-drawer
      v-model="drawer"
      :permanent="permanent"
      app
      color="grey lighten-4"
      :width="sidebarWidth"
      class="sidebar-drawer"
    >
      <v-toolbar flat>
        <v-toolbar-title>Resizable Sidebar</v-toolbar-title>
      </v-toolbar>
  
      <v-divider></v-divider>
  
      <!-- Some content, e.g., a list of nav items -->
      <v-list dense>
        <v-list-item
          v-for="(item, idx) in items"
          :key="idx"
          link
          @click="navigate(item.to)"
        >
          <v-list-item-icon>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-item-icon>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
  
      <!-- A couple of buttons at bottom for demonstration -->
      <div class="px-3 mt-auto">
        <v-btn block color="primary" class="mb-2">
          Save
        </v-btn>
        <v-btn block color="secondary">
          Cancel
        </v-btn>
      </div>
  
      <!-- Resizer handle (absolutely positioned within the drawer) -->
      <div
        class="resizer"
        @mousedown.stop="startResize"
      ></div>
    </v-navigation-drawer>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  
  // Props
  const props = defineProps({
    permanent: {
      type: Boolean,
      default: true
    }
  })
  
  const drawer = ref(true)
  
  // Default width for the sidebar
  const sidebarWidth = ref('300px')
  
  // List of nav items
  const items = ref([
    { title: 'Home', icon: 'mdi-home', to: '/' },
    { title: 'Settings', icon: 'mdi-cog', to: '/settings' },
    { title: 'Printers', icon: 'mdi-printer', to: '/printers' },
    { title: 'About', icon: 'mdi-information', to: '/about' }
  ])
  
  const router = useRouter()
  function navigate(to) {
    router.push(to)
  }
  
  /**
   * Resizing logic
   */
  let isResizing = false
  
  function startResize(evt) {
    isResizing = true
  }
  
  function handleMouseMove(evt) {
    if (!isResizing) return
    // The mouse's X position determines the new width.
    // Optional: add a min or max width
    const newWidth = `${evt.clientX}px`
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
  .sidebar-drawer {
    position: relative; /* so the resizer can be absolutely positioned */
  }
  
  .resizer {
    position: absolute;
    top: 0;
    right: 0;
    width: 5px;
    height: 100%;
    cursor: col-resize;
    /* Optional styling */
    background-color: rgba(0, 0, 0, 0.05);
  }
  </style>
  