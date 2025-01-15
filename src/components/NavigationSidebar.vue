<template>
    <v-navigation-drawer app right color="secondary" dark permanent attach="right">
      <v-list>
        <v-list-item>
          <v-list-item-title>Shortcuts</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item v-for="(item, index) in shortcuts" :key="index">
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref } from 'vue';
  
  export default defineComponent({
    name: 'NavigationSidebar',
    setup() {
      const shortcuts = ref([
        { title: 'View Mode' },
        { title: 'Theme Settings' },
        { title: 'Printer Shortcuts' },
      ]);
  
      return { shortcuts };
    },
  });
  </script>
  
  <style scoped></style>