<template>
  <v-container>
    <v-card class="pa-4">
      <v-card-title class="text-h5">Printer Fleet</v-card-title>
      <v-sheet
        class="elevation-0 mt-4"
        style="display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));"
      >
        <v-card
          v-for="printer in printers"
          :key="printer.mac"
          class="pa-3 floating-card"
        >
          <v-card-title class="text-h6">
         
            <a :href="`http://${printer.ip}`" target="_blank">{{ printer.hostname }}</a>
          </v-card-title>
          <v-card-text>
            <div>
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
            <div v-if="printer.print_progress !== null">
              <v-progress-circular
                :model-value="printer.print_progress * 100"
                color="green"
                size="50"
                width="5"
                class="mt-2"
              >
                {{ (printer.print_progress * 100).toFixed(0) }}%
              </v-progress-circular>
            </div>
            {{ printer.state_message }}
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
  print_progress: number; // Already included in the `/devices` API response
  state_message: string;
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

      // Merge or add new printers
      newData.forEach((device) => {
        const index = updatedPrinters.findIndex((printer) => printer.mac === device.mac);
        if (index !== -1) {
          updatedPrinters[index] = { ...updatedPrinters[index], ...device };
        } else {
          updatedPrinters.push(device);
        }
      });

      // Remove duplicates by hostname
      const uniquePrinters = updatedPrinters.reduce((acc: Printer[], current) => {
        const isDuplicate = acc.some((printer) => printer.hostname === current.hostname);
        if (!isDuplicate) {
          acc.push(current);
        }
        return acc;
      }, []);

      printers.value = uniquePrinters;
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
  border-radius: 12px;
  box-shadow: 0px 4px 8px rgba(94, 93, 93, 0.37), 0px 2px 4px rgba(128, 128, 128, 0.342);
  background-color: surface;
  transition: transform 0.2s, box-shadow 0.2s;
}

.floating-card:hover {
  transform: translateY(-4px);
  box-shadow: 0px 8px 16px rgb(202, 199, 13), 0px 4px 8px rgba(238, 255, 0, 0.356);
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
/* unvisited link */
a:link {
  color: rgb(0, 89, 255);
  text-decoration: none;
}

/* visited link */
a:visited {
  color: rgb(117, 255, 152);
  text-decoration: none;
}

/* mouse over link */
a:hover {
  color: hotpink;
}

/* selected link */
a:active {
  color: blue;
}
</style>
