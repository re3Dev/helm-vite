<template>
  <v-app>
    <v-app-bar app color="surface" dark>
      <v-toolbar-title>Printer Fleet Management</v-toolbar-title>
      <v-spacer></v-spacer>
      <ThemeToggle />
    </v-app-bar>
    <v-main>
      <PrinterList />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PrinterList from './components/PrinterList.vue';
import ThemeToggle from './components/ThemeToggle.vue';

export default defineComponent({
  name: 'App',
  components: { PrinterList, ThemeToggle },
});
</script>