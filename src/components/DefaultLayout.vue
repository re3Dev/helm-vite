<!-- App.vue (or DefaultLayout.vue) -->
<template>
    <v-app>
        <v-app-bar app color="#000000" dark>
          &ensp;&ensp;<img src="/src/assets/re3D Logo White.png" width="40.9px" height="47.5px">
      <v-toolbar-title>HELM</v-toolbar-title>

      <!-- Optionally add other elements, e.g. a user menu, buttons, etc. -->
      <v-spacer />
      <v-btn icon>
        <v-icon color="primary">mdi-account</v-icon>
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
  import { commandGroups } from './commandService.ts';
  // Adjust path if needed
  

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
  