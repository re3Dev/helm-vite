<template>
  <v-container fluid class="fill-height">
        <!-- Add View Toggle at top -->
        <v-btn-toggle v-model="viewType" mandatory class="mb-4">
      <v-btn value="grid">
        <v-icon>mdi-grid</v-icon>
      </v-btn>
      <v-btn value="list">
        <v-icon>mdi-format-list-bulleted</v-icon>
      </v-btn>
    </v-btn-toggle>
    <!-- Firmware Restart Button -->
    <v-btn
      color="red"
      class="mb-4"
      :disabled="selectedPrinters.length === 0"
      @click="restartFirmware"
    >
      <v-icon left>mdi-restart</v-icon>
      Firmware Restart (Selected)
    </v-btn>
    <v-card v-if="viewType === 'grid'" class="pa-4" color="background" width="100%">
      <v-sheet
        class="grid-container"
        color="background"
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
    <span style="margin-left: 8px;">
      <strong>{{ printer.modelType || 'Unknown Model' }}</strong>
    </span>
  </div>
  

            <v-progress-linear
              v-if="printer.status === 'Printing' && printer.state_message === 'Printer is ready'"
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
                  {{ printer.state_message === 'Printer is ready' ? formatFileName(printer.file_path) : 'Not Printing' }}
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
                    'text-yellow': printer.status === 'Printing' && printer.state_message === 'Printer is ready',
                    'text-green': printer.status === 'Ready',
                    'text-grey': printer.status === 'Idle',
                    'text-red': printer.state_message !== 'Printer is ready',
                  }"
                >
                <template v-if="printer.state_message !== 'Printer is ready'">
                  <v-icon class="text-red">mdi-alert-circle</v-icon>
                  <span class="text-red">ERROR</span>
                </template>
                <template v-else-if="printer.status === 'Printing'">
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
            <div class="status-container" v-if="printer.state_message !== 'Printer is ready' && selectedPrinters.includes(printer.ip)">
              <span class="text-red">
              <v-icon>mdi-alert-circle</v-icon>
              {{ printer.state_message }}
              </span>
            </div>
          

            <div class="temperature-container">
  <div class="extruder-temps" :class="{ 'horizontal': !printer.extruder2_temperature }">
    <div class="temp-reading" :class="{ 'pellet': printer.extruder2_temperature }">
      <v-icon 
        :class="{
          'text-blue': printer.extruder_temperature < 60,
          'text-yellow': printer.extruder_temperature >= 60
        }"
        class="temp-icon">
        {{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-printer-3d-nozzle-outline' }}
      </v-icon>
      <span class="temp-label"></span>
      <span class="temp-value">{{ Math.round(printer.extruder_temperature) }}°C</span>
    </div>
    <div class="temp-reading" :class="{ 'pellet': printer.extruder2_temperature }">
      <v-icon 
        :class="{
          'text-blue': printer.extruder1_temperature < 60,
          'text-yellow': printer.extruder1_temperature >= 60
        }"
        class="temp-icon">
        {{ printer.extruder2_temperature ? 'mdi-screw-machine-flat-top' : 'mdi-printer-3d-nozzle-outline' }}
      </v-icon>
      <span class="temp-label"></span>
      <span class="temp-value">{{ Math.round(printer.extruder1_temperature) }}°C</span>
    </div>
  </div>
            <div class="temp-reading" :class="{ 'pellet': printer.extruder2_temperature }" v-if="printer.extruder2_temperature !== null && printer.extruder2_temperature !== undefined">
              <v-icon 
                :class="{
                  'text-blue': printer.extruder2_temperature < 60,
                  'text-yellow': printer.extruder2_temperature >= 60
                }"
                class="temp-icon">
                mdi-printer-3d-nozzle-outline
              </v-icon>
              <span class="temp-label"></span>
              <span class="temp-value">{{ Math.round(printer.extruder2_temperature) }}°C</span>
            </div>
            <div class="temp-reading" :class="{ 'pellet': printer.extruder2_temperature }">
              <v-icon 
                :class="{
                  'text-blue': printer.heater_bed_temperature < 40,
                  'text-yellow': printer.heater_bed_temperature >= 40
                }"
                class="temp-icon">
                mdi-radiator
              </v-icon>
              <span class="temp-label"></span>
              <span class="temp-value">{{ Math.round(printer.heater_bed_temperature) }}°C</span>
            </div>
            </div>
          </v-card-text>
        </v-card>
      </template>
      </v-sheet>
        </v-card>
        <v-card v-else class="pa-4" color="background" width="100%">
          <div class="table-container">
          <v-table>
          <thead>
            <tr>
              <th style="width: 20%">Hostname</th>
              <th style="width: 15%">Type</th>
              <th style="width: 15%">Status</th>
              <th style="width: 15%">Progress</th>
              <th style="width: 35%">Print File</th>
            </tr>
      </thead>
      <tbody>
  <tr v-for="printer in sortedPrinters" 
      :key="printer.ip"
      :class="{ 'selected-row': selectedPrinters.includes(printer.ip) }"
      @click="toggleSelection(printer.ip)">
    <td>{{ printer.hostname }}</td>
    <td>{{ printer.extruder2_temperature ? 'Pellet' : 'Filament' }}</td>
    <td>{{ printer.status }}</td>
    <td>
      <v-progress-linear
        v-if="printer.status === 'Printing' && printer.state_message === 'Printer is ready'"
        :model-value="printer.print_progress * 100"
        color="#FFBD00"
        height="20"
        striped
        bg-color="#BCBEC0"
        bg-opacity="0.8"
      >
      <bold>
                <strong>
                  <v-text style="color: black;">
                    {{ (printer.print_progress * 100).toFixed(0) }}%
                  </v-text>
                </strong>
              </bold></v-progress-linear>
    </td>
    
      <td class="text-truncate">
        <span v-if="printer.state_message === 'Printer is ready'">
          {{ formatFileName(printer.file_path) }}
        </span>
      </td>
  </tr>
</tbody>
    </v-table>
    </div>
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
  modelType?: string; // Added for dynamic model detection
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
const viewType = ref('grid') // 'grid' or 'list'

const toggleView = () => {
  viewType.value = viewType.value === 'grid' ? 'list' : 'grid'
}
const startPrint = (ip: string) => {
  console.log('Start print:', ip);
  // Add start print logic
};

const pausePrint = (ip: string) => {
  console.log('Pause print:', ip);
  // Add pause print logic
};

const stopPrint = (ip: string) => {
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

    const updatePrinters = async (newData: Printer[]) => {
      const updatedPrinters = [...printers.value];

      // Helper to fetch and parse model type from .master.cfg
      async function fetchModelType(ip: string): Promise<string | null> {
        try {
          const res = await fetch(`http://${ip}/server/files/config/.master.cfg`);
          if (!res.ok) return null;
          const text = await res.text();
          // Only use the first two lines
          const lines = text.split(/\r?\n/).slice(0, 2);
          const firstLine = lines[0]?.trim(); // e.g. [fff] or [fgf]
          const secondLine = lines[1]?.trim(); // e.g. platform_type=regular
          const platformMatch = secondLine?.match(/platform_type\s*=\s*(\w+)/i);
          const platform = platformMatch ? platformMatch[1].toLowerCase() : '';
          let model = '';
          if (firstLine === '[fff]') {
            if (platform === 'regular') model = 'Gigabot 4';
            else if (platform === 'xlt') model = 'Gigabot 4 XLT';
            else if (platform === 'terabot') model = 'Terabot 4';
          } else if (firstLine === '[fgf]') {
            if (platform === 'regular') model = 'GigabotX 2';
            else if (platform === 'xlt') model = 'GigabotX 2 XLT';
            else if (platform === 'terabot') model = 'TerabotX 2';
          }
          return model || `${firstLine || ''} ${platform}`.trim() || null;
        } catch (e) {
          console.warn(`Failed to fetch model type for ${ip}:`, e);
          return null;
        }
      }

      for (const device of newData) {
        const index = updatedPrinters.findIndex((printer) => printer.mac === device.mac);
        if (index !== -1) {
          updatedPrinters[index] = { ...updatedPrinters[index], ...device };
        } else {
          // New printer: fetch model type
          const modelType = await fetchModelType(device.ip);
          updatedPrinters.push({ ...device, modelType: modelType ?? undefined });
        }
      }

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

    // Firmware Restart function (now sends M119 as a test, direct to printer IP)
    const restartFirmware = async () => {
      if (selectedPrinters.value.length === 0) return;
      const results = await Promise.all(selectedPrinters.value.map(async (ip) => {
        try {
          const res = await fetch(`http://${ip}/printer/gcode/script?script=M119`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (!res.ok) throw new Error(`Failed for ${ip}`);
          return { ip, success: true };
        } catch (e) {
          return { ip, success: false };
        }
      }));
      // Optionally show a summary
      const failed = results.filter(r => !r.success);
      if (failed.length === 0) {
        alert('M119 sent to all selected printers!');
      } else {
        alert('Some printers failed: ' + failed.map(f => f.ip).join(', '));
      }
    };

    return { viewType, toggleView, printers, sortedPrinters, isLoading, selectedPrinters, startPrint, stopPrint, pausePrint, toggleSelection, formatFileName, restartFirmware };
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
.text-red {
  color: red;
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
  padding: 8px;
  margin: 8px 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 0; /* Remove gap between temperature readings */
}

.temp-reading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin: 0; /* Remove any margin */
  padding: 2px 0; /* Add small vertical padding instead */
}

.temp-reading.pellet {
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 1px 0; /* Reduce padding for pellet readings */
}

.temp-icon {
  font-size: 18px !important;
}

.temp-label {
  font-weight: bold;
  color: #ffffff;
}
.temp-header {
  display: flex;
  align-items: center;
  gap: 4px;
}
.temp-value {
  font-size: 0.9rem;
  font-weight: bold;
}
.extruder-temps {
  display: flex;
  flex-direction: column;
  gap: 0; /* Remove gap between extruder temps */
  justify-content: center;
  width: 100%;
  align-items: center;
}

.extruder-temps.horizontal {
  flex-direction: row;
  gap: 12px;
  justify-content: center;
}

.file-path-container {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  max-width: 100%;
  position: relative;
  animation: scrollText 20s linear infinite;
}

@keyframes scrollText {
  from {
    transform: translateX(200%);
  }
  to {
    transform: translateX(-200%);
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
.selected-row {
  background-color: #393B3E;
  border: 2px solid #FFD400;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin: 0 auto;
  width: 100%;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  margin-top: -16px; /* Reduce space after toggle buttons */
}
.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

.v-table {
  width: 100%;
  min-width: 800px;
  margin-top: 0;
}

.floating-card {
  height: 100%;
}
.v-container {
  padding-top: 0; /* Remove top padding */
  display: flex;
  flex-direction: column;
  gap: 16px;
}

</style>

