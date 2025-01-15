<template>
    <v-navigation-drawer app color="primary" dark permanent>
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
  
  <style scoped></style>