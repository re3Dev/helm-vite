<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title background-color="black" class="text-h5">Printer Fleet</v-card-title>
      <v-sheet
        class="elevation-0 mt-4"
        style="display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));"
      >
        <v-card
          v-for="printer in printers"
          :key="printer.mac"
          class="pa-3 floating-card"
        >
          <v-card-title class="text-h6">{{ printer.hostname }}</v-card-title>
          <v-card-subtitle>
            <a :href="`http://${printer.ip}`" target="_blank">{{ printer.ip }}</a>
          </v-card-subtitle>
          <v-card-text>
            <div>
              <strong>Status:</strong>
              <span
                :class="{
                  'text-yellow': printer.status === 'Printing',
                  'text-green': printer.status === 'Ready',
                  'text-grey': printer.status === 'Idle',
                }"
              >
                {{ printer.status }}
              </span>
            </div>
            <div><strong>Extruder Temp:</strong> {{ printer.extruder_temperature }}°C</div>
            <div><strong>Extruder1 Temp:</strong> {{ printer.extruder1_temperature }}°C</div>
            <div><strong>MAC:</strong> {{ printer.mac }}</div>
          </v-card-text>
        </v-card>
      </v-sheet>
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
  name: 'PrinterGrid',
  setup() {
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
        const index = updatedPrinters.findIndex((printer) => printer.mac === device.mac);
        if (index !== -1) {
          updatedPrinters[index] = { ...updatedPrinters[index], ...device };
        } else {
          updatedPrinters.push(device);
        }
      });

      printers.value = updatedPrinters;
    };

    onMounted(() => {
      fetchPrinters();
      fetchInterval = window.setInterval(fetchPrinters, 5000);
    });

    onBeforeUnmount(() => {
      if (fetchInterval) {
        clearInterval(fetchInterval);
      }
    });

    return { printers };
  },
});
</script>

<style scoped>
.floating-card {
  border-radius: 12px; /* Rounded corners */
  box-shadow: 0px 4px 8px rgba(219, 218, 218, 0.1), 0px 2px 4px rgba(197, 195, 195, 0.548); /* Floating shadow */
  background-color: #121212; /* White background */
  transition: transform 0.2s, box-shadow 0.2s; /* Smooth hover effects */
}

.floating-card:hover {
  transform: translateY(-4px); /* Slight lift on hover */
  box-shadow: 0px 8px 16px rgba(0, 0, 0, 0.12), 0px 4px 8px rgba(0, 0, 0, 0.08); /* Enhanced shadow on hover */
}

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
