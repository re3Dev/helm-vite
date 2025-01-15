<template>
  <v-app class="d-flex">
    <!-- Left Sidebar -->
    <CommandSidebar />

    <!-- Main Content -->
    <v-main class="flex-grow-1">
      <div class="content-wrapper">
        <PrinterList />
      </div>
    </v-main>

    <!-- Right Sidebar -->
    <NavigationSidebar />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CommandSidebar from './components/CommandSidebar.vue';
import NavigationSidebar from './components/TitleBar.vue';
import PrinterList from './components/PrinterList.vue';

export default defineComponent({
  name: 'App',
  components: { CommandSidebar, NavigationSidebar, PrinterList },
});
</script>

<style scoped></style>