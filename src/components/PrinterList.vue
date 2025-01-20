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
          :class="{ 'selected-card': selectedPrinters.includes(printer.mac) }"
          @click="toggleSelection(printer.mac)"
        >
          <v-divider>
            <v-card-title class="text-h6">
              <a :href="`http://${printer.ip}`" target="_blank">{{ printer.hostname }}</a>
            </v-card-title>
          </v-divider>
          <v-divider color="cyan" :thickness="6"></v-divider>
          <v-card-text>
            <div v-if="printer.thumbnail_url">
              <img :src="printer.thumbnail_url" alt="Thumbnail" class="thumbnail-image"/></div>
            <v-progress-linear
              :model-value="printer.print_progress * 100"
              color="cyan"
              :height="20"
              class="mt-2"
              :striped="true"
              bg-color="grey"
              bg-opacity="0.3"
            >
              <bold>
                <strong>
                  <v-text style="color: white;">
                    {{ (printer.print_progress * 100).toFixed(0) }}%
                  </v-text>
                </strong>
              </bold>

            </v-progress-linear>
            <br>
            <div>
            <strong>
                  <v-text style="color: white;">
                    {{ formatFileName(printer.file_path) }}
                  </v-text>
                </strong>
            </div>
            <br />
            <div>
              <strong>
                <span
                  :class="{
                    'text-yellow': printer.status === 'Printing',
                    'text-green': printer.status === 'Ready',
                    'text-grey': printer.status === 'Idle',
                  }"
                >
                  {{ printer.status }}
                </span>
              </strong>
            </div>
            <br />
            <strong>{{ printer.state_message }}</strong>
            <br /><br />
            <v-divider color="yellow" :thickness="2"></v-divider>
            <br />
            <div><strong>Extruder Temp:</strong> {{ printer.extruder_temperature }}°C</div>
            <div><strong>Extruder1 Temp:</strong> {{ printer.extruder1_temperature }}°C</div>
            <br />
            <v-divider color="yellow" :thickness="2"></v-divider>
            <br />
            <div><strong>IP Address: </strong> {{ printer.ip }}</div>
            <div><strong>MAC Address: </strong> {{ printer.mac }}</div>
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
  print_progress: number;
  state_message: string;
  file_path: string;
  thumbnail_url: string;
}
export default defineComponent({
  name: 'PrinterGrid',
  setup() {
    const printers = ref<Printer[]>([]);
    const selectedPrinters = ref<string[]>([]); // Store selected printer MAC addresses

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

      const uniquePrinters = updatedPrinters.reduce((acc: Printer[], current) => {
        const isDuplicate = acc.some((printer) => printer.hostname === current.hostname);
        if (!isDuplicate) {
          acc.push(current);
        }
        return acc;
      }, []);

      printers.value = uniquePrinters;
    };

    const toggleSelection = (mac: string) => {
      if (selectedPrinters.value.includes(mac)) {
        selectedPrinters.value = selectedPrinters.value.filter((selected) => selected !== mac);
      } else {
        selectedPrinters.value.push(mac);
      }
    };

    const formatFileName = (filePath: string | null): string => {
  if (!filePath) {
    return "Not Printing"; // Default text when filePath is null or undefined
  }
  const prefix = "/home/pi/printer_data/gcodes/";
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
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

    return { printers, selectedPrinters, toggleSelection, formatFileName };
  },
});
</script>


<style scoped>
.floating-card {
  border-radius: 12px;
  box-shadow: 0px 4px 8px rgba(94, 93, 93, 0.37), 0px 2px 4px rgba(128, 128, 128, 0.342);
  background-color: surface;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.floating-card:hover {
  transform: translateY(-4px);
  box-shadow: 0px 8px 16px rgba(224, 228, 16, 0.712), 0px 4px 8px rgba(238, 255, 0, 0.356);
}

.selected-card {
  background-color: rgba(216, 202, 12, 0); /* Change background for selected cards */
  border: 2px solid rgb(238, 255, 0);
  box-shadow: 0px 8px 16px rgb(196, 216, 12), 0px 4px 8px rgba(238, 255, 0, 0.5);
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

a:link,
a:visited {
  color: rgb(255, 255, 255);
  text-decoration: none;
}

a:hover {
  color: hotpink;
}

a:active {
  color: blue;
}
.thumbnail-image {
  width: 100%;
  max-height: 150px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 10px;
}
</style>

