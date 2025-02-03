<template>
  <v-container>
    <v-card class="pa-4" color="background">
      
      <v-sheet
        class="elevation-0 mt-4" color="background"
        style="display: grid; gap: 24px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));"
      >
      <template v-if="isLoading">
  <v-card
    v-for="n in 12"
    :key="n"
    color="#181B20"
    class="pa-3 floating-card"
  >
    <v-skeleton-loader
      type="heading, divider, heading, list-item, subtitle, image"
      :loading="true"
    >
    </v-skeleton-loader>
  </v-card>
</template>
      <template v-else>
      <v-card
        v-for="printer in sortedPrinters"
        :key="printer.ip"
        color="#181B20"
        class="pa-3 floating-card"
        :class="{ 'selected-card': selectedPrinters.includes(printer.ip) }"
        @click="toggleSelection(printer.ip)"
>

          <v-divider>
            <v-card-title class="text-h6">
              <a :href="`http://${printer.ip}`" target="_blank">{{ printer.hostname }}</a>
            </v-card-title>
          </v-divider>
          <v-divider color="yellow" :thickness="1"></v-divider>
          <v-card-text>
            <div class="printer-type">
    <v-icon :color="printer.extruder2_temperature ? 'cyan' : 'cyan'">
      {{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-movie-roll' }}
    </v-icon>
    <strong>
      {{ printer.extruder2_temperature ? ' Pellet' : ' Filament' }}
    </strong>
  </div>
  

            <v-progress-linear
              v-if="printer.status === 'Printing'"
              :model-value="printer.print_progress * 100"
              color="#FFBD00"
              :height="20"
              class="mt-2"
              :striped="true"
              bg-color="#BCBEC0"
              bg-opacity="0.8"
              :stream="false"
            >
              <bold>
                <strong>
                  <v-text style="color: black;">
                    {{ (printer.print_progress * 100).toFixed(0) }}%
                  </v-text>
                </strong>
              </bold>

            </v-progress-linear>
            <br>
            <div class="file-path-container">
            <strong>
                  <v-text style="color: white;">
                    {{ formatFileName(printer.file_path) }}
                  </v-text>
                </strong>
            </div>
              <!-- Print Control Buttons -->
              <div class="print-controls" v-if="selectedPrinters.includes(printer.ip)">
  <template v-if="printer.status === 'Printing'">
    <v-btn
      color="warning"
      variant="tonal"
      class="mr-2"
      @click="pausePrint(printer.ip)"
    >
      <v-icon>mdi-pause</v-icon>
      Pause Print
    </v-btn>
    <v-btn
      color="red"
      variant="tonal"
      @click="stopPrint(printer.ip)"
    >
      <v-icon>mdi-stop</v-icon>
      Stop Print
    </v-btn>
  </template>
  <template v-else>
    <v-btn
      color="success"
      variant="tonal"
      @click="startPrint(printer.ip)"
    >
      <v-icon>mdi-play</v-icon>
      Start Print
    </v-btn>
  </template>
</div>
            <br />
            <div>
              <strong>
                <div class="status-container">
                <span  
                  :class="{
                    'text-yellow': printer.status === 'Printing',
                    'text-green': printer.status === 'Ready',
                    'text-grey': printer.status === 'Idle',
                  }"
                >
                <template v-if="printer.status === 'Printing'">
                  <v-icon>mdi-printer-3d-nozzle</v-icon>
                  PRINTING
                </template>
                <template v-else-if="printer.status === 'Ready'">
                  <v-icon>mdi-home</v-icon>
                  HOMED
                </template>
                <template v-else-if="printer.status === 'Idle'">
                  <v-icon>mdi-engine-off</v-icon>
                  MOTORS DISENGAGED
                </template>
                <template v-else>
                  Status Unknown
                </template>
                </span>
                </div>
              </strong>
            </div>
            <div class="status-container" v-if="printer.state_message !== 'Printer is ready'">
              <span class="text-red">
              <v-icon>mdi-alert-circle</v-icon>
              {{ printer.state_message }}
              </span>
            </div>
          

            <div class="temperature-container">
            <div class="temp-reading">
              <v-icon 
                :class="{
                  'text-blue': printer.extruder_temperature < 60,
                  'text-yellow': printer.extruder_temperature >= 60
                }"
                class="temp-icon">
                mdi-printer-3d-nozzle-outline
              </v-icon>
              <span class="temp-label">(E0):</span>
              <span class="temp-value">{{ printer.extruder_temperature }}°C</span>
            </div>
            <div class="temp-reading">
              <v-icon 
                :class="{
                  'text-blue': printer.extruder1_temperature < 60,
                  'text-yellow': printer.extruder1_temperature >= 60
                }"
                class="temp-icon">
                mdi-printer-3d-nozzle-outline
              </v-icon>
              <span class="temp-label">(E1):</span>
              <span class="temp-value">{{ printer.extruder1_temperature }}°C</span>
            </div>
            <div class="temp-reading" v-if="printer.extruder2_temperature !== null && printer.extruder2_temperature !== undefined">
              <v-icon 
                :class="{
                  'text-blue': printer.extruder2_temperature < 60,
                  'text-yellow': printer.extruder2_temperature >= 60
                }"
                class="temp-icon">
                mdi-printer-3d-nozzle-outline
              </v-icon>
              <span class="temp-label">(E2):</span>
              <span class="temp-value">{{ printer.extruder2_temperature }}°C</span>
            </div>
            <div class="temp-reading">
              <v-icon 
                :class="{
                  'text-blue': printer.heater_bed_temperature < 40,
                  'text-yellow': printer.heater_bed_temperature >= 40
                }"
                class="temp-icon">
                mdi-radiator
              </v-icon>
              <span class="temp-label">(BED):</span>
              <span class="temp-value">{{ printer.heater_bed_temperature }}°C</span>
            </div>
            </div>
          </v-card-text>
        </v-card>
      </template>
      </v-sheet>
    </v-card>
  </v-container>
</template>


<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { selectedPrinters } from '../store/printerStore'; // Import the shared ref


interface Printer {
  hostname: string;
  ip: string;
  status: string;
  extruder_temperature: number;
  extruder1_temperature: number;
  extruder2_temperature: number;
  heater_bed_temperature: number;
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

    let fetchInterval: number | null = null;
    const sortedPrinters = computed(() => {
      return [...printers.value].sort((a, b) => {
        if (a.status === 'Printing' && b.status !== 'Printing') return -1;
        if (a.status !== 'Printing' && b.status === 'Printing') return 1;
        return 0;
  });
});
const startPrint = (ip) => {
  console.log('Start print:', ip);
  // Add start print logic
};

const pausePrint = (ip) => {
  console.log('Pause print:', ip);
  // Add pause print logic
};

const stopPrint = (ip) => {
  console.log('Stop print:', ip);
  // Add stop print logic
};
    const fetchPrinters = async () => {
      try {
        const response = await fetch('/api/devices');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        updatePrinters(data);
        isLoading.value = false;
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



    const toggleSelection = (ip: string) => {
  if (selectedPrinters.value.includes(ip)) {
    selectedPrinters.value = selectedPrinters.value.filter((selected) => selected !== ip);
    console.log(`Printer with IP ${ip} unselected.`);
  } else {
    selectedPrinters.value.push(ip);
    console.log(`Printer with IP ${ip} selected.`);
  }

  // Log all currently selected printers
  console.log("Currently selected printers:", selectedPrinters.value);
};



    const formatFileName = (filePath: string | null): string => {
  if (!filePath) {
    return "Not Printing"; // Default text when filePath is null or undefined
  }
  const prefix = "/home/pi/printer_data/gcodes/";
  return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
};

const isLoading = ref(true)
    onMounted(() => {
      fetchPrinters();
      fetchInterval = window.setInterval(fetchPrinters, 5000);
    });

    onBeforeUnmount(() => {
      if (fetchInterval) {
        clearInterval(fetchInterval);
      }
    });

    return { printers, sortedPrinters, isLoading, selectedPrinters, toggleSelection, formatFileName };
  },
});
</script>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');

/* Apply Lato font to all elements */
* {
  font-family: 'Lato', sans-serif !important;
}
.floating-card {
  border-radius: 12px;
  box-shadow: 0px 4px 8px rgba(219, 219, 219, 0.788), 0px 2px 4px rgb(221, 221, 221);
  background-color: surface;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.floating-card:hover {
  transform: translateY(-4px);
  box-shadow: 0px 8px 16px #FFBD00, 0px 4px 8px #F2F2F2;
}

.selected-card {
  background-color: #393B3E; /* Change background for selected cards */
  border: 2px solid #FFD400;
  box-shadow: 0px 8px 16px #FFDF00, 0px 4px 8px #FFC800;
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
  color: #FFDF00;
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
.status-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: inline-block;
}
.temperature-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin: 8px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.temp-reading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.temp-icon {
  font-size: 24px;
}

.temp-label {
  font-weight: bold;
  color: #ffffff;
}

.temp-value {
  color: #ffffff;
  font-family: monospace;
}
.file-path-container {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  position: relative;
  transition: transform 0.3s;
}

.file-path-container:hover {
  overflow: visible;
  text-overflow: unset;
  animation: scrollText 3.5s linear forwards;
  animation-delay: 0.2s;
}

@keyframes scrollText {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-150%);  /* Removed pixel offset to scroll full width */
  }
}
.print-controls {
  display: flex;
  flex-direction: column;  /* Stack buttons vertically */
  gap: 4px;
  margin: 4px 0;
  align-items: center;
}

.v-btn {
  padding: 0 4px !important;
  min-width: 30px !important;
  font-size: 0.75rem !important;
  height: 28px !important;
}

.v-btn .v-icon {
  margin-right: 2px !important;
  font-size: 16px !important;
}
.v-skeleton-loader {
  border-radius: 8px;
}
</style>

