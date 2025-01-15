<template>
  <v-app>
    <v-container fluid class="d-flex pa-0" style="height: 100vh;">
      <!-- Left Sidebar -->
      <v-navigation-drawer app permanent width="250" class="primary">
        <CommandSidebar />
      </v-navigation-drawer>

      <!-- Main Content -->
      <v-main class="flex-grow-1">
        <PrinterList />
      </v-main>

      <!-- Right Sidebar -->
      <v-navigation-drawer app right permanent width="250" class="secondary">
        <NavigationSidebar />
      </v-navigation-drawer>
    </v-container>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CommandSidebar from './components/CommandSidebar.vue';
import NavigationSidebar from './components/NavigationSidebar.vue';
import PrinterList from './components/PrinterList.vue';

export default defineComponent({
  name: 'App',
  components: {
    CommandSidebar,
    NavigationSidebar,
    PrinterList,
  },
});
</script>

<style scoped>
.primary {
  background-color: #2c3e50;
}
.secondary {
  background-color: #34495e;
}
</style>
