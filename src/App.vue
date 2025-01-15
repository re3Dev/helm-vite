<template>
  <v-app>
    <!-- Title Bar -->
    <TitleBar />

    <div class="app-layout">
      <!-- Left Sidebar -->
      <CommandSidebar />

      <!-- Main Content -->
      <v-main>
        <PrinterList />
      </v-main>
    </div>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CommandSidebar from './components/CommandSidebar.vue';
import TitleBar from './components/TitleBar.vue';
import PrinterList from './components/PrinterList.vue';

export default defineComponent({
  name: 'App',
  components: { CommandSidebar, TitleBar, PrinterList },
});
</script>

<style scoped></style>