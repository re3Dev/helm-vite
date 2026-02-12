<template>
  <v-container fluid class="fill-height">
    <!-- Top bar: centered view toggle + utilities on right -->
    <div class="top-bar">
      <div class="top-bar-left"></div>

      <div class="top-bar-center">
        <v-btn-toggle v-model="viewType" mandatory>
          <v-btn value="grid">
            <v-icon>mdi-grid</v-icon>
          </v-btn>
          <v-btn value="list">
            <v-icon>mdi-format-list-bulleted</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>

      <div class="top-bar-right">
        <!-- ✅ Refresh button (moved to right) -->
        <v-btn
          variant="tonal"
          color="yellow"
          size="small"
          class="refresh-btn"
          @click="refreshNow"
          :loading="isRefreshing"
          :disabled="isLoading || isRefreshing"
          title="Refresh printer list"
        >
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>

        <!-- Utilities dropdown -->
        <v-menu location="bottom end" offset="8">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon
              variant="text"
              class="utility-btn"
              :title="'Utilities'"
            >
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list density="compact" class="utility-menu">
            <v-list-item
              :disabled="selectedPrinters.length === 0"
              @click="restartFirmware"
            >
              <template #prepend>
                <v-icon color="red">mdi-restart</v-icon>
              </template>
              <v-list-item-title>Firmware Restart (Selected)</v-list-item-title>
              <v-list-item-subtitle v-if="selectedPrinters.length === 0">
                Select at least one printer
              </v-list-item-subtitle>
            </v-list-item>

            <!-- Add more utilities later -->
          </v-list>
        </v-menu>
      </div>
    </div>

    <!-- GRID VIEW -->
    <v-card v-if="viewType === 'grid'" class="pa-4" color="background" width="100%">
      <v-sheet class="grid-container" color="background">
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
            />
          </v-card>
        </template>

        <template v-else>
          <v-card
            v-for="printer in sortedPrinters"
            :key="printer.ip"
            color="#181B20"
            class="pa-3 floating-card"
            :class="{
              'selected-card': selectedPrinters.includes(printer.ip),
              'locked-card': isPrinterLocked(printer),
              'unlocked-printing-card': isPrinterPrinting(printer) && !isPrinterLocked(printer)
            }"
            @click="toggleSelection(printer)"
          >
            <!-- Lock icon (top-right) -->
            <div class="lock-badge" v-if="isPrinterPrinting(printer)">
              <v-btn
                icon
                size="x-small"
                variant="tonal"
                color="grey"
                class="lock-btn"
                @click.stop="togglePrinterLock(printer)"
                :title="isPrinterLocked(printer) ? 'Unlock to allow selection' : 'Lock selection'"
              >
                <v-icon :color="isPrinterLocked(printer) ? 'yellow' : 'green'">
                  {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                </v-icon>
              </v-btn>
            </div>

            <v-divider>
              <v-card-title class="text-h6">
                <a :href="printer.ui_url" target="_blank">{{ printer.hostname }}</a>
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
                  <br />
                  <span class="printer-ip">
                    <v-icon small color="green" style="vertical-align: middle; margin-right: 4px;">mdi-wifi</v-icon>{{ printer.ip }}
                  </span>
                </span>
              </div>

              <v-progress-linear
                v-if="isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'"
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

              <br />

              <div class="file-path-container">
                <strong>
                  <v-text style="color: white;">
                    {{ printer.state_message === 'Printer is ready' ? formatFileName(printer.file_path) : 'Not Printing' }}
                  </v-text>
                </strong>
              </div>

              <br />

              <div>
                <strong>
                  <div class="status-container">
                    <span
                      :class="{
                        'text-yellow': isPrinterPrinting(printer) && printer.state_message === 'Printer is ready',
                        'text-green': isReady(printer),
                        'text-grey': isIdle(printer),
                        'text-red': printer.state_message !== 'Printer is ready',
                      }"
                    >
                      <template v-if="printer.state_message !== 'Printer is ready'">
                        <v-icon class="text-red">mdi-alert-circle</v-icon>
                        <span class="text-red">ERROR</span>
                      </template>

                      <template v-else-if="isPrinterBusy(printer)">
                        <v-icon>mdi-timer-sand</v-icon>
                        BUSY
                      </template>

                      <template v-else-if="isPrinterPrinting(printer)">
                        <v-icon>mdi-printer-3d-nozzle</v-icon>
                        PRINTING
                      </template>

                      <template v-else-if="isReady(printer)">
                        <v-icon>mdi-home</v-icon>
                        HOMED
                      </template>

                      <template v-else-if="isIdle(printer)">
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
                      class="temp-icon"
                    >
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
                      class="temp-icon"
                    >
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
                    class="temp-icon"
                  >
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
                    class="temp-icon"
                  >
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

    <!-- LIST VIEW -->
    <v-card v-else class="pa-4" color="background" width="100%">
      <div class="table-container">
        <v-table>
          <thead>
            <tr>
              <th style="width: 4%"></th>
              <th style="width: 20%">Hostname</th>
              <th style="width: 15%">Type</th>
              <th style="width: 15%">Status</th>
              <th style="width: 15%">Progress</th>
              <th style="width: 31%">Print File</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="printer in sortedPrinters"
              :key="printer.ip"
              :class="{
                'selected-row': selectedPrinters.includes(printer.ip),
                'locked-row': isPrinterLocked(printer)
              }"
              @click="toggleSelection(printer)"
            >
              <td>
                <v-btn
                  v-if="isPrinterPrinting(printer)"
                  icon
                  size="x-small"
                  variant="text"
                  @click.stop="togglePrinterLock(printer)"
                  :title="isPrinterLocked(printer) ? 'Unlock to allow selection' : 'Lock selection'"
                >
                  <v-icon :color="isPrinterLocked(printer) ? 'yellow' : 'green'">
                    {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                  </v-icon>
                </v-btn>
              </td>

              <td>{{ printer.hostname }}</td>
              <td>{{ printer.extruder2_temperature ? 'Pellet' : 'Filament' }}</td>
              <td>{{ isPrinterBusy(printer) ? 'Busy' : printer.status }}</td>

              <td>
                <v-progress-linear
                  v-if="isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'"
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
                  </bold>
                </v-progress-linear>
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
import { selectedPrinters } from '../store/printerStore';
import { apiFetch } from '../api';

interface Printer {
  hostname: string;
  ip: string;
  mac: string;
  base_url: string;
  ui_url: string;
  status: string;
  extruder_temperature: number;
  extruder1_temperature: number;
  extruder2_temperature: number;
  heater_bed_temperature: number;
  print_progress: number;
  state_message: string;
  file_path: string;
  thumbnail_url: string;
  modelType?: string;

  // ✅ derived fields (frontend only)
  derived_printing?: boolean;
}

type PrinterCache = {
  lastPrintingAt?: number;          // last time we saw strong evidence of printing
  lastKnownStatus?: string;         // last non-empty status
  lastKnownStateMessage?: string;   // last non-empty state_message
  lastKnownFilePath?: string;       // last non-empty file_path
};

export default defineComponent({
  name: 'PrinterGrid',
  setup() {
    const printers = ref<Printer[]>([]);
    const isLoading = ref(true);

    // ✅ refresh state
    const isRefreshing = ref(false);

    const unlockedWhilePrinting = ref<Set<string>>(new Set());

    // ✅ per-printer cache to prevent flapping + preserve last good fields
    const cacheByIp = ref<Record<string, PrinterCache>>({});

    // how long to "hold" printing true after it was true
    const PRINTING_GRACE_MS = 15_000;

    const normalizeStatus = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const isReady = (p: Printer) => normalizeStatus(p.status) === 'ready';
    const isIdle = (p: Printer) => normalizeStatus(p.status) === 'idle';

    const isPrinterBusy = (p: Printer) => {
      const s = normalizeStatus(p.status);
      return s === 'busy' || s.includes('busy');
    };

    // ✅ raw signal (no hysteresis)
    const rawIsPrinting = (p: Printer) => {
      const s = normalizeStatus(p.status);
      if (s !== 'printing') return false;

      // If Moonraker says printing, we accept it.
      // We still keep file/progress checks as *extra* evidence (used by hysteresis),
      // but we don’t require them anymore.
      return true;
    };

    // ✅ "strong evidence" of printing helps us keep printing stable
    const hasStrongPrintingEvidence = (p: Printer) => {
      const hasFile = typeof p.file_path === 'string' && p.file_path.trim().length > 0;
      const hasProgress = typeof p.print_progress === 'number' && p.print_progress > 0;
      return rawIsPrinting(p) || hasFile || hasProgress;
    };

    const isPrinterPrinting = (p: Printer) => {
      if (typeof p.derived_printing === 'boolean') return p.derived_printing;
      return rawIsPrinting(p);
    };

    const isPrinterLocked = (p: Printer) => {
      return isPrinterPrinting(p) && !unlockedWhilePrinting.value.has(p.ip);
    };

    const togglePrinterLock = (p: Printer) => {
      if (!isPrinterPrinting(p)) return;
      const s = new Set(unlockedWhilePrinting.value);
      if (s.has(p.ip)) s.delete(p.ip);
      else s.add(p.ip);
      unlockedWhilePrinting.value = s;
    };

    let fetchInterval: number | null = null;

    // ✅ sorting stays stable
    const sortedPrinters = computed(() => {
      const printing = (p: Printer) => isPrinterPrinting(p);

      return [...printers.value].sort((a, b) => {
        const ap = printing(a);
        const bp = printing(b);

        // ✅ Not printing first, printing last
        if (ap !== bp) return ap ? 1 : -1;

        // ✅ stable tie breaker (prevents jumping)
        const ah = String(a.hostname || '');
        const bh = String(b.hostname || '');
        const hn = ah.localeCompare(bh, undefined, { sensitivity: 'base' });
        if (hn !== 0) return hn;

        return String(a.ip || '').localeCompare(String(b.ip || ''), undefined, { sensitivity: 'base' });
      });
    });

    const viewType = ref('grid');

    // ✅ Only replace old fields if the new value is actually usable
    const mergePreferGood = <T extends Record<string, any>>(oldObj: T, incoming: Partial<T>): T => {
      const out: any = { ...oldObj };

      for (const [k, v] of Object.entries(incoming)) {
        // keep old if incoming is null/undefined
        if (v === null || v === undefined) continue;

        // keep old if incoming is an empty string
        if (typeof v === 'string' && v.trim().length === 0) continue;

        out[k] = v;
      }

      return out as T;
    };

    const applyDerivedPrinting = (p: Printer): Printer => {
      const now = Date.now();
      const ip = p.ip;
      const c = (cacheByIp.value[ip] ??= {});

      const raw = rawIsPrinting(p);
      const strong = hasStrongPrintingEvidence(p);

      // update last-known good fields for stability
      if (typeof p.status === 'string' && p.status.trim().length > 0) c.lastKnownStatus = p.status;
      if (typeof p.state_message === 'string' && p.state_message.trim().length > 0) c.lastKnownStateMessage = p.state_message;
      if (typeof p.file_path === 'string' && p.file_path.trim().length > 0) c.lastKnownFilePath = p.file_path;

      // if we lost status/state_message due to some transient backend nulls,
      // restore last known values so UI doesn’t say "Unknown"
      const stableStatus = (typeof p.status === 'string' && p.status.trim().length > 0) ? p.status : (c.lastKnownStatus ?? p.status);
      const stableStateMessage =
        (typeof p.state_message === 'string' && p.state_message.trim().length > 0)
          ? p.state_message
          : (c.lastKnownStateMessage ?? p.state_message);

      const stableFilePath =
        (typeof p.file_path === 'string' && p.file_path.trim().length > 0)
          ? p.file_path
          : (c.lastKnownFilePath ?? p.file_path);

      // hysteresis: once printing, keep it for a grace window
      if (strong) {
        c.lastPrintingAt = now;
      }

      const wasRecentlyPrinting =
        typeof c.lastPrintingAt === 'number' && (now - c.lastPrintingAt) < PRINTING_GRACE_MS;

      const derived_printing = raw || wasRecentlyPrinting;

      return {
        ...p,
        status: stableStatus,
        state_message: stableStateMessage,
        file_path: stableFilePath,
        derived_printing,
      };
    };

    const fetchPrinters = async (opts?: { force?: boolean }) => {
      try {
        const force = !!opts?.force;
        const path = force ? '/api/devices?force=1' : '/api/devices';

        const data = await apiFetch<Printer[]>(path);
        await updatePrinters(data);
        isLoading.value = false;
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      }
    };

    const refreshNow = async () => {
      if (isRefreshing.value) return;
      try {
        isRefreshing.value = true;
        await fetchPrinters({ force: true });
      } finally {
        isRefreshing.value = false;
      }
    };

    const updatePrinters = async (newData: Printer[]) => {
      const updatedPrinters = [...printers.value];

      async function fetchModelType(baseUrl: string): Promise<string | null> {
        try {
          const res = await fetch(`${baseUrl}/server/files/config/.master.cfg`);
          if (!res.ok) return null;
          const text = await res.text();

          const lines = text.split(/\r?\n/).slice(0, 2);
          const firstLine = lines[0]?.trim();
          const secondLine = lines[1]?.trim();
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
          console.warn(`Failed to fetch model type for ${baseUrl}:`, e);
          return null;
        }
      }

      for (const device of newData) {
        const index = updatedPrinters.findIndex((printer) => printer.mac === device.mac);
        if (index !== -1) {
          // ✅ SAFE MERGE: don’t overwrite good values with null/empty
          updatedPrinters[index] = mergePreferGood(updatedPrinters[index], device);
        } else {
          const modelType = await fetchModelType(device.base_url);
          updatedPrinters.push({ ...device, modelType: modelType ?? undefined });
        }
      }

      const uniquePrinters = updatedPrinters.reduce((acc: Printer[], current) => {
        const isDuplicate = acc.some((printer) => printer.hostname === current.hostname);
        if (!isDuplicate) acc.push(current);
        return acc;
      }, []);

      // ✅ Apply stability + hysteresis before committing
      printers.value = uniquePrinters.map(applyDerivedPrinting);

      const printingIps = new Set(printers.value.filter(isPrinterPrinting).map(p => p.ip));
      const nextUnlocked = new Set<string>();
      unlockedWhilePrinting.value.forEach(ip => {
        if (printingIps.has(ip)) nextUnlocked.add(ip);
      });
      unlockedWhilePrinting.value = nextUnlocked;

      selectedPrinters.value = selectedPrinters.value.filter(ip => {
        const p = printers.value.find(x => x.ip === ip);
        return !p || !isPrinterLocked(p);
      });
    };

    const toggleSelection = (printer: Printer) => {
      if (isPrinterLocked(printer)) return;

      const ip = printer.ip;
      if (selectedPrinters.value.includes(ip)) {
        selectedPrinters.value = selectedPrinters.value.filter((selected) => selected !== ip);
      } else {
        selectedPrinters.value.push(ip);
      }
    };

    const formatFileName = (filePath: string | null): string => {
      if (!filePath) return "Not Printing";
      const prefix = "/home/pi/printer_data/gcodes/";
      return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
    };

    onMounted(() => {
      fetchPrinters();
      fetchInterval = window.setInterval(fetchPrinters, 5000);
    });

    onBeforeUnmount(() => {
      if (fetchInterval) clearInterval(fetchInterval);
    });

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

      const failed = results.filter(r => !r.success);
      if (failed.length === 0) alert('M119 sent to all selected printers!');
      else alert('Some printers failed: ' + failed.map(f => f.ip).join(', '));
    };

    return {
      viewType,
      printers,
      sortedPrinters,
      isLoading,
      isRefreshing,
      refreshNow,
      selectedPrinters,
      toggleSelection,
      formatFileName,
      restartFirmware,
      isPrinterBusy,
      isPrinterPrinting,
      isPrinterLocked,
      togglePrinterLock,
      isReady,
      isIdle,
    };
  },
});
</script>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap');
* { font-family: 'Lato', sans-serif !important; }

/* ✅ three-column top bar: center toggle stays centered */
.top-bar {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
}
.top-bar-left { justify-self: start; }
.top-bar-center { justify-self: center; }

/* ✅ right side now has refresh + utilities */
.top-bar-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn { opacity: 0.95; }
.utility-btn { opacity: 0.9; }
.utility-menu { min-width: 260px; }

/* Cards */
.floating-card {
  position: relative;
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
  background-color: #393B3E;
  border: 2px solid #FFD400;
  box-shadow: 0px 8px 16px #FFDF00, 0px 4px 8px #FFC800;
}
.locked-card { opacity: 0.65; cursor: not-allowed; }
.unlocked-printing-card { border: 1px dashed rgba(255, 255, 255, 0.25); }

.lock-badge { position: absolute; top: 8px; right: 8px; z-index: 5; }
.lock-btn {
  height: 28px !important;
  width: 28px !important;
  min-width: 28px !important;
  padding: 0 !important;
}

.locked-row { opacity: 0.7; }

.text-yellow { color: yellow; }
.text-green { color: green; }
.text-grey { color: grey; }
.text-red { color: red; }

a:link, a:visited { color: rgb(255, 255, 255); text-decoration: none; }
a:hover { color: #FFDF00; }
a:active { color: blue; }

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
  gap: 0;
}

.temp-reading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 2px 0;
}
.temp-reading.pellet {
  flex-direction: row;
  gap: 4px;
  align-items: center;
  justify-content: center;
  padding: 1px 0;
}
.temp-icon { font-size: 18px !important; }
.temp-label { font-weight: bold; color: #ffffff; }
.temp-value { font-size: 0.9rem; font-weight: bold; }

.extruder-temps {
  display: flex;
  flex-direction: column;
  gap: 0;
  justify-content: center;
  width: 100%;
  align-items: center;
}
.extruder-temps.horizontal { flex-direction: row; gap: 12px; justify-content: center; }

.file-path-container {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
  max-width: 100%;
  position: relative;
  animation: scrollText 20s linear infinite;
}
@keyframes scrollText {
  from { transform: translateX(200%); }
  to { transform: translateX(-200%); }
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

.v-skeleton-loader { border-radius: 8px; }

.selected-row { background-color: #393B3E; border: 2px solid #FFD400; }

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 24px;
  margin: 0 auto;
  width: 100%;
}

.table-container { width: 100%; overflow-x: auto; margin-top: -8px; }

.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 0;
}

.v-table { width: 100%; min-width: 800px; margin-top: 0; }

.floating-card { height: 100%; }

.v-container {
  padding-top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
