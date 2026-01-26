<template>
  <!-- DO NOT nest another v-app here -->
  <v-app-bar app dark class="animated-toolbar">
    &ensp;&ensp;
    <img src="/src/assets/re3D Logo White.png" width="40.9px" height="47.5px" />
    <v-toolbar-title>HELM</v-toolbar-title>

    <v-spacer />

    <v-btn variant="text" to="/" class="nav-btn">Dashboard</v-btn>
    <v-btn variant="text" to="/analytics" class="nav-btn">Analytics</v-btn>

    <v-btn icon>
      <v-icon color="primary">mdi-account</v-icon>
    </v-btn>
  </v-app-bar>

  <!-- v-main should contain your app content -->
  <v-main>
    <div class="layout-container">
      <!-- Sidebar stays persistent -->
      <MachineCommandSidebar :groups="commandGroups" />

      <!-- Routed content goes here -->
      <div class="main-content">
        <router-view />
      </div>
    </div>
  </v-main>
</template>

<script setup lang="ts">
import MachineCommandSidebar from './MachineCommandSidebar.vue'
import { commandGroups } from './commandService.ts'
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');

/* Apply Lato font to all elements */
* {
  font-family: 'Lato', sans-serif !important;
}

.animated-toolbar {
  background: linear-gradient(270deg, #000000, #1a1a1a, #2c2c2c, #1a1a1a, #000000);
  background-size: 1000% 100%;
  animation: gradientFlow 30s ease infinite;
}

@keyframes gradientFlow {
  0% { background-position: 0% 50% }
  50% { background-position: 100% 50% }
  100% { background-position: 0% 50% }
}

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

.nav-btn {
  color: #fff;
  font-weight: bold;
  text-transform: none;
  margin-right: 8px;
}
</style>
