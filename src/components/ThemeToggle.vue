<template>
    <v-btn icon @click="toggleTheme" :color="buttonColor" class="theme-toggle-btn">
      <v-icon>{{ themeIcon }}</v-icon>
    </v-btn>
  </template>
  
  <script lang="ts">
  import { defineComponent, computed } from 'vue';
  import { useTheme } from 'vuetify';
  
  export default defineComponent({
    name: 'ThemeToggle',
    setup() {
      const theme = useTheme();
  
      // Check if the current theme is dark
      const isDarkTheme = computed(() => theme.global.name.value === 'dark');
  
      // Toggle between light and dark themes
      const toggleTheme = () => {
        theme.global.name.value = isDarkTheme.value ? 'light' : 'dark';
      };
  
      // Set the icon based on the theme
      const themeIcon = computed(() => (isDarkTheme.value ? 'mdi-weather-sunny' : 'mdi-weather-night'));
  
      // Change button color dynamically
      const buttonColor = computed(() => (isDarkTheme.value ? 'yellow' : 'blue'));
  
      return { toggleTheme, themeIcon, buttonColor };
    },
  });
  </script>
  
  <style scoped>
  .theme-toggle-btn {
    transition: background-color 0.3s ease;
  }
  .theme-toggle-btn:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  </style>
  