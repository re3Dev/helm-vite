<template>
  <v-container color="secondary">
    <v-card :color="surfaceColor" class="pa-4">
      <v-card-title class="text-h5">Printer Fleet</v-card-title>
      <v-data-table
        :headers="headers"
        :items="printers"
        class="elevation-1 mt-4"
        :items-per-page="5"
        dense
      />
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useTheme } from 'vuetify';

export default defineComponent({
  name: 'PrinterList',
  setup() {
    const headers = ref([
      { text: 'Hostname', value: 'hostname' },
      { text: 'IP Address', value: 'ip' },
      { text: 'Status', value: 'status' },
      { text: 'Extruder Temp (°C)', value: 'extruder_temperature' },
    ]);

    const printers = ref([]);

    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/devices');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        printers.value = await response.json();
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    };

    // Use Vuetify's theme system to get the current surface color
    const theme = useTheme();
    const surfaceColor = computed(() => theme.global.current.value.surface); 
    onMounted(fetchPrinters);

    return { headers, printers, surfaceColor };
  },
});
</script>

<style scoped>
/* Optional styles for customization */
</style>
