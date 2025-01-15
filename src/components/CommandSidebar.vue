<template>
    <v-navigation-drawer app color="primary" dark permanent style="width: 300px; height: 100vh; flex-shrink: 0;">
      <v-list>
        <v-list-item>
          <v-list-item-title>Commands</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item v-for="(item, index) in commands" :key="index">
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref } from 'vue';
  
  export default defineComponent({
    name: 'CommandSidebar',
    setup() {
      const commands = ref([
        { title: 'Start Print' },
        { title: 'Stop Print' },
        { title: 'Pause Print' },
      ]);
  
      return { commands };
    },
  });
  </script>
  
  <style scoped>
  /* Main container for the layout */
  .app-layout {
    display: flex;
    height: 100vh; /* Full viewport height */
  }
  
  /* Left Sidebar */
  .command-sidebar {
    width: 300px;
    flex-shrink: 0;
    background-color: #2c3e50;
    color: white;
  }
  
  /* Main Content */
  .main-content {
    flex-grow: 1; /* Expand to fill space */
    display: flex;
    justify-content: center; /* Center horizontally */
    align-items: flex-start; /* Align content to the top */
    background-color: #121212; /* Background color */
    color: white;
    padding: 20px;
    overflow-y: auto; /* Scrollable if content overflows */
  }
  </style>