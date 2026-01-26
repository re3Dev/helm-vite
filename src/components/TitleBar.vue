<template>
  <v-app-bar app color="secondary" dark>
    <v-toolbar-title>Printer Fleet Manager</v-toolbar-title>

    <v-spacer />

    <!-- Analytics -->
    <v-btn icon :to="{ path: '/analytics' }" link>
      <v-icon>mdi-chart-bar</v-icon>
    </v-btn>

    <v-btn icon>
      <v-icon>mdi-cog</v-icon>
    </v-btn>

    <v-btn icon>
      <v-icon>mdi-refresh</v-icon>
    </v-btn>

    <v-btn icon>
      <v-icon>mdi-theme-light-dark</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TitleBar',
});
</script>

<style scoped>
.command-sidebar {
  width: 300px;
  height: 100vh;
}

.app-layout {
  display: flex;
  flex-direction: row;
  height: calc(100vh - 64px);
}

.v-main {
  flex-grow: 1;
  overflow-y: auto;
  background-color: #121212;
  color: white;
}
</style>
