<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="printers"
      class="elevation-1"
    />
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';

interface Printer {
  hostname: string;
  ip: string;
  status: string;
  extruder_temperature: number;
}

export default defineComponent({
  name: 'PrinterList',
  setup() {
    const headers = ref([
      { text: 'Hostname', value: 'hostname' },
      { text: 'IP Address', value: 'ip' },
      { text: 'Status', value: 'status' },
      { text: 'Extruder Temp (°C)', value: 'extruder_temperature' },
    ]);

    const printers = ref<Printer[]>([]);

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

    onMounted(fetchPrinters);

    return { headers, printers };
  },
});
</script>
