<template>
    <div class="layout-container">
      <div 
        class="sidebar" 
        :style="{ width: sidebarWidth + 'px' }"
        @mousedown="startResize"
      >
        <CommandSidebar />
        <div class="sidebar-resizer" @mousedown.stop.prevent="startResize"></div>
      </div>
  
      <div class="main-content">
        <PrinterList />
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted, onBeforeUnmount } from 'vue'
  import CommandSidebar from './CommandSidebar.vue'
  import PrinterList from './PrinterList.vue'
  
  const sidebarWidth = ref(250) // default width
  let isResizing = false
  
  function startResize(e) {
    isResizing = true
  }
  
  function handleMouseMove(e) {
    if (!isResizing) return
    sidebarWidth.value = e.clientX // or some clamp logic
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
  .layout-container {
    display: flex;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }
  
  .sidebar {
    flex-shrink: 0;
    background-color: #f1f1f1;
    position: relative; /* so that the resizer is positioned relative to the sidebar */
  }
  
  .sidebar-resizer {
    width: 5px;
    cursor: col-resize;
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    background-color: #ccc;
  }
  
  .main-content {
    flex: 1;
    overflow: auto;
  }
  </style>
  