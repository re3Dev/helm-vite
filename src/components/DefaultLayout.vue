<!-- App.vue (or DefaultLayout.vue) -->
<template>
    <v-app>
        <v-app-bar app color="primary" dark>
      <v-toolbar-title>My Top Bar</v-toolbar-title>

      <!-- Optionally add other elements, e.g. a user menu, buttons, etc. -->
      <v-spacer />
      <v-btn icon>
        <v-icon>mdi-account</v-icon>
      </v-btn>
    </v-app-bar>
    <v-main></v-main>
      <div class="layout-container">
        <!-- Our resizable + expandable sidebar -->
        <MachineCommandSidebar :groups="commandGroups" />
  
        <!-- Some placeholder main content on the right -->
        <div class="main-content">
          <PrinterList />
        </div>
      </div>
    
    </v-app>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import MachineCommandSidebar from './MachineCommandSidebar.vue' 
  import PrinterList from './PrinterList.vue';
  // Adjust path if needed
  
  const commandGroups = ref([
    {
      title: 'Calibration',
      icon: 'mdi-tools',
      open: false,
      commands: ['Bed Level', 'Extruder Calibration']
    },
    {
      title: 'Material',
      icon: 'mdi-flask',
      open: false,
      commands: ['Load Filament', 'Unload Filament', 'Purge']
    },
    {
      title: 'Movement',
      icon: 'mdi-robot',
      open: false,
      commands: ['Home All Axes', 'Move X', 'Move Y', 'Move Z']
    }
  ])
  </script>
  
  <style scoped>
  .layout-container {
    display: flex;
    width: 100%;
    height: 100%;
  }
  
  .main-content {
    flex: 1;
    overflow: auto;
    padding: 16px;
    display: flex;
    height: 100%;
  }
  </style>
  