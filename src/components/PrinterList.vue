<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title class="text-h5">Printer Fleet</v-card-title>
      <v-data-table
        :headers="headers"
        :items="printers"
        class="elevation-1 mt-4"
        :items-per-page="50"
        dense
        item-value="mac" 
        :show-select="true"
      >
        <!-- Slot to customize the Status column -->
        <template #item.status="{ item }">
          <span
            :class="{
              'text-yellow': item.status === 'Printing',
              'text-green': item.status === 'Ready',
              'text-grey': item.status === 'Idle',
            }"
          >
            {{ item.status }}
          </span>
        </template>

        <!-- Slot to render the IP column as a clickable link -->
        <template #item.ip="{ item }">
          <a :href="`http://${item.ip}`" target="_blank">{{ item.ip }}</a>
        </template>
      </v-data-table>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';

interface Printer {
  hostname: string;
  ip: string;
  status: string;
  extruder_temperature: number;
  extruder1_temperature: number;
  mac: string;
}

export default defineComponent({
  name: 'PrinterList',
  setup() {
    const headers = ref([
      { text: 'Hostname', value: 'hostname' },
      { text: 'IP Address', value: 'ip' },
      { text: 'Mac Address', value: 'mac' },
      { text: 'Status', value: 'status' },
      { text: 'Extruder Temp (°C)', value: 'extruder_temperature' },
      { text: 'Extruder1 Temp (C)', value: 'extruder1_temperature' },
    ]);

    const printers = ref<Printer[]>([]);
    let fetchInterval: number | null = null;

    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/devices');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        updatePrinters(data);
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    };

    const updatePrinters = (newData: Printer[]) => {
      const updatedPrinters = [...printers.value];

      newData.forEach((device) => {
        // Match existing entries by MAC address
        const index = updatedPrinters.findIndex((printer) => printer.mac === device.mac);
        if (index !== -1) {
          // Update existing printer data
          updatedPrinters[index] = { ...updatedPrinters[index], ...device };
        } else {
          // Add new printer
          updatedPrinters.push(device);
        }
      });

      printers.value = updatedPrinters;
    };

    onMounted(() => {
      fetchPrinters();
      fetchInterval = window.setInterval(fetchPrinters, 5000); // Fetch every 5 seconds
    });

    onBeforeUnmount(() => {
      if (fetchInterval) {
        clearInterval(fetchInterval);
      }
    });

    return { headers, printers };
  },
});
</script>

<style scoped>
.text-yellow {
  color: yellow;
}
.text-green {
  color: green;
}
.text-grey {
  color: grey;
}
</style>
