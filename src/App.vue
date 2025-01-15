<template>
  <v-app class="d-flex">
    <!-- Left Sidebar -->
    <DefaultLayout />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import NavigationSidebar from './components/TitleBar.vue';
import PrinterList from './components/PrinterList.vue';
import DefaultLayout from './components/DefaultLayout.vue';

export default defineComponent({
  name: 'App',
  components: { NavigationSidebar, PrinterList, DefaultLayout },
});
</script>

<style scoped></style>