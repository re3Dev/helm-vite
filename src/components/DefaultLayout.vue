<template>
    <v-app>
      <div class="app-container">
        <!-- Our resizable sidebar -->
        <ResizableSidebar />
  
        <!-- The main content area -->
        <div class="main-content">
          <!-- If you use Vue Router -->
          <router-view />
          <PrinterList />
          <!-- Or directly place your content, e.g. <PrinterList /> -->
        </div>
      </div>
    </v-app>
  </template>
  
  <script setup>
  import ResizableSidebar from './ResizableSidebar.vue'
  import PrinterList from './PrinterList.vue';
  </script>
  
  <style scoped>
  .app-container {
    display: flex;
    width: 100%;
    height: 100vh; /* or whatever fits your design */
  }
  
  /* The main content should flex:1 so it takes the remaining space */
  .main-content {
    flex: 1;
    overflow: auto;   /* let table or content scroll if needed */
  }
  </style>
  