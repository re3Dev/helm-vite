<template>
  <v-navigation-drawer app color="primary" dark :permanent="isSidebarOpen" :width="isSidebarOpen ? '300px' : '80px'" style="height: 100vh; flex-shrink: 0;">
    <v-btn icon @click="toggleSidebar" class="mb-4">
      <v-icon>{{ isSidebarOpen ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
    </v-btn>
    <v-list v-if="isSidebarOpen">
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
    const isSidebarOpen = ref(true);

    const toggleSidebar = () => {
      isSidebarOpen.value = !isSidebarOpen.value;
    };

    const commands = ref([
      { title: 'Start Print' },
      { title: 'Stop Print' },
      { title: 'Pause Print' },
    ]);

    return { isSidebarOpen, toggleSidebar, commands };
  },
});
</script>

<style scoped>
/* Command Sidebar Styles */
.command-sidebar {
  width: 300px;
  flex-shrink: 0;
  background-color: #2c3e50;
  color: white;
}

.v-navigation-drawer {
  transition: width 0.3s ease;
}

.v-btn {
  color: white;
}
</style>
