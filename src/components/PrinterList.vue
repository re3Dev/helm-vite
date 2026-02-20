<template>
  <v-container fluid class="printer-list-root">
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
        <v-btn
          variant="outlined"
          color="red"
          size="small"
          class="estop-btn"
          :disabled="selectedPrinters.length === 0"
          @click="emergencyStopSelected"
          title="Emergency stop selected printers"
        >
          <v-icon start>mdi-alert-octagon</v-icon>
          Emergency Stop
        </v-btn>

        <!-- Utilities dropdown -->
        <v-menu location="bottom end" offset="8">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" class="utility-btn" :title="'Utilities'">
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>

          <v-list density="compact" class="utility-menu">
            <v-list-item :disabled="selectedPrinters.length === 0" @click="restartFirmware">
              <template #prepend>
                <v-icon color="red">mdi-restart</v-icon>
              </template>
              <v-list-item-title>Firmware Restart (Selected)</v-list-item-title>
              <v-list-item-subtitle v-if="selectedPrinters.length === 0">
                Select at least one printer
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item @click="showSortSettings = true">
              <template #prepend>
                <v-icon color="yellow">mdi-sort</v-icon>
              </template>
              <v-list-item-title>Sort Settings</v-list-item-title>
            </v-list-item>

            <!-- Add more utilities later -->
          </v-list>
        </v-menu>
      </div>
    </div>

    <v-dialog v-model="showSortSettings" max-width="560">
      <v-card color="background">
        <v-card-title class="d-flex align-center">
          <v-icon color="yellow" class="mr-2">mdi-sort</v-icon>
          Printer Sort Settings
        </v-card-title>

        <v-card-text>
          <v-radio-group v-model="sortMode" density="compact">
            <v-radio value="dynamic" label="Dynamic (non-printing first, printing last)"></v-radio>
            <v-radio value="alphabetical" label="Alphabetical (static)"></v-radio>
            <v-radio value="custom" label="Custom order (static)"></v-radio>
          </v-radio-group>

          <div v-if="sortMode === 'custom'" class="custom-order-box">
            <div class="text-caption mb-2">Move printers to set display order:</div>
            <v-list density="compact" class="custom-order-list">
              <v-list-item
                v-for="(printer, idx) in customOrderPrinters"
                :key="printer.ip"
                class="custom-order-item"
              >
                <template #prepend>
                  <span class="order-index">{{ idx + 1 }}</span>
                </template>

                <v-list-item-title>{{ printer.hostname }}</v-list-item-title>
                <v-list-item-subtitle>{{ printer.ip }}</v-list-item-subtitle>

                <template #append>
                  <div class="order-actions">
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      :disabled="idx === 0"
                      @click="moveCustomOrderUp(printer.ip)"
                    >
                      <v-icon>mdi-chevron-up</v-icon>
                    </v-btn>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      :disabled="idx === customOrderPrinters.length - 1"
                      @click="moveCustomOrderDown(printer.ip)"
                    >
                      <v-icon>mdi-chevron-down</v-icon>
                    </v-btn>
                  </div>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="tonal" color="yellow" @click="showSortSettings = false">Done</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- GRID VIEW -->
    <v-card v-if="viewType === 'grid'" class="pa-4" color="background" width="100%">
      <v-sheet class="grid-container" color="background">
        <template v-if="isLoading">
          <v-card v-for="n in 12" :key="n" color="#181B20" class="pa-3 floating-card">
            <v-skeleton-loader type="heading, divider, heading, list-item, subtitle, image" :loading="true" />
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
            @dblclick.stop="selectLockedPrinter(printer)"
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

            <!-- body is a flex column so temps can pin to bottom -->
            <v-card-text class="card-body">
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

              <!-- ✅ Progress slot (always reserves space, prevents layout drift) -->
              <div class="progress-slot">
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
              </div>

              <!-- ✅ File slot (fixed height, scrolling text inside) -->
              <div class="file-slot">
                <div class="file-path-container">
                  <strong>
                    <v-text style="color: white;">
                      {{ isPrinterPrinting(printer)
                        ? formatFileName(printer.file_path)
                        : 'Not Printing'
                      }}
                    </v-text>
                  </strong>
                </div>
              </div>

              <div v-if="selectedFileName" class="file-availability-row">
                <span :class="['file-availability-badge', fileAvailabilityClass(printer)]">
                  <v-icon size="14">{{ fileAvailabilityIcon(printer) }}</v-icon>
                  {{ fileAvailabilityLabel(printer) }}
                </span>
              </div>


              <!-- status + reserved second line (compact) -->
              <div class="status-stack">
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
                      DISENGAGED
                    </template>

                    <template v-else>
                      Status Unknown
                    </template>
                  </span>
                </div>

                <!-- always present: reserves 1 line -->
                <div class="status-sub">
                  <span
                    v-if="getTransientStatus(printer)"
                    :class="transientStatusClass(printer)"
                  >
                    <v-icon>mdi-progress-clock</v-icon>
                    {{ getTransientStatus(printer) }}
                  </span>
                  <span
                    v-else-if="printer.state_message !== 'Printer is ready' && selectedPrinters.includes(printer.ip)"
                    class="text-red"
                  >
                    <v-icon>mdi-alert-circle</v-icon>
                    {{ printer.state_message }}
                  </span>
                </div>
              </div>

              <!-- temps -->
              <div class="temperature-container">
                <div class="extruder-temps" :class="{ horizontal: !printer.extruder2_temperature }">
                  <div class="temp-reading" :class="{ pellet: printer.extruder2_temperature }">
                    <div class="temp-icon-wrap">
                      <v-icon
                        :class="{
                          'text-blue': printer.extruder_temperature < 60,
                          'text-yellow': printer.extruder_temperature >= 60
                        }"
                        class="temp-icon"
                      >
                        {{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-printer-3d-nozzle-outline' }}
                      </v-icon>
                      <span class="heater-indicator" :class="heaterStateClass(printer.extruder_temperature, printer.extruder_target)"></span>
                    </div>
                    <span class="temp-label"></span>
                    <span class="temp-value">{{ Math.round(printer.extruder_temperature) }}°C</span>
                  </div>

                  <div class="temp-reading" :class="{ pellet: printer.extruder2_temperature }">
                    <div class="temp-icon-wrap">
                      <v-icon
                        :class="{
                          'text-blue': printer.extruder1_temperature < 60,
                          'text-yellow': printer.extruder1_temperature >= 60
                        }"
                        class="temp-icon"
                      >
                        {{ printer.extruder2_temperature ? 'mdi-screw-machine-flat-top' : 'mdi-printer-3d-nozzle-outline' }}
                      </v-icon>
                      <span class="heater-indicator" :class="heaterStateClass(printer.extruder1_temperature, printer.extruder1_target)"></span>
                    </div>
                    <span class="temp-label"></span>
                    <span class="temp-value">{{ Math.round(printer.extruder1_temperature) }}°C</span>
                  </div>
                </div>

                <div
                  class="temp-reading"
                  :class="{ pellet: printer.extruder2_temperature }"
                  v-if="printer.extruder2_temperature !== null && printer.extruder2_temperature !== undefined"
                >
                  <div class="temp-icon-wrap">
                    <v-icon
                      :class="{
                        'text-blue': printer.extruder2_temperature < 60,
                        'text-yellow': printer.extruder2_temperature >= 60
                      }"
                      class="temp-icon"
                    >
                      mdi-printer-3d-nozzle-outline
                    </v-icon>
                    <span class="heater-indicator" :class="heaterStateClass(printer.extruder2_temperature, printer.extruder2_target)"></span>
                  </div>
                  <span class="temp-label"></span>
                  <span class="temp-value">{{ Math.round(printer.extruder2_temperature) }}°C</span>
                </div>

                <div class="temp-reading" :class="{ pellet: printer.extruder2_temperature }">
                  <div class="temp-icon-wrap">
                    <v-icon
                      :class="{
                        'text-blue': printer.heater_bed_temperature < 40,
                        'text-yellow': printer.heater_bed_temperature >= 40
                      }"
                      class="temp-icon"
                    >
                      mdi-radiator
                    </v-icon>
                    <span class="heater-indicator" :class="heaterStateClass(printer.heater_bed_temperature, printer.heater_bed_target)"></span>
                  </div>
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
              @dblclick.stop="selectLockedPrinter(printer)"
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
              <td>
                <span v-if="getTransientStatus(printer)" :class="transientStatusClass(printer)">
                  {{ getTransientStatus(printer) }}
                </span>
                <span v-else>
                  {{ isPrinterBusy(printer) ? 'Busy' : printer.status }}
                </span>
              </td>

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
                <span>
                  {{ isPrinterPrinting(printer) ? formatFileName(printer.file_path) : 'Not Printing' }}
                </span>
                <div v-if="selectedFileName" :class="['list-file-availability', fileAvailabilityClass(printer)]">
                  {{ fileAvailabilityLabel(printer) }}
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { selectedPrinters } from '../store/printerStore';
import { apiFetch } from '../api';
import { scannerCidr, printerBaseUrlByIp, printerTransientStatusByIp, selectedPrintFile } from './commandService';

interface Printer {
  hostname: string;
  ip: string;
  mac: string;
  base_url: string;
  ui_url: string;
  status: string;
  extruder_temperature: number;
  extruder_target?: number;
  extruder1_temperature: number;
  extruder1_target?: number;
  extruder2_temperature: number;
  extruder2_target?: number;
  heater_bed_temperature: number;
  heater_bed_target?: number;
  print_progress: number;
  state_message: string;
  file_path: string;
  thumbnail_url: string;
  modelType?: string;

  derived_printing?: boolean;
}

type PrinterCache = {
  lastPrintingAt?: number;
  lastKnownStatus?: string;
  lastKnownStateMessage?: string;
  lastKnownFilePath?: string;
};

type SortMode = 'dynamic' | 'alphabetical' | 'custom';
type FileAvailability = 'checking' | 'exists' | 'missing' | 'error';

export default defineComponent({
  name: 'PrinterGrid',
  setup() {
    const printers = ref<Printer[]>([]);
    const isLoading = ref(true);
    const showSortSettings = ref(false);
    const sortMode = ref<SortMode>('dynamic');
    const customOrder = ref<string[]>([]);

    const unlockedWhilePrinting = ref<Set<string>>(new Set());
    const cacheByIp = ref<Record<string, PrinterCache>>({});
    const selectedFileAvailabilityByIp = ref<Record<string, FileAvailability>>({});
    const selectedFileName = computed(() => String(selectedPrintFile.value || '').trim());
    let fileAvailabilityRun = 0;

    const SORT_MODE_KEY = 'printerListSortMode';
    const SORT_ORDER_KEY = 'printerListCustomOrder';

    const PRINTING_GRACE_MS = 4_000;
    const POLL_INTERVAL_MS = 1_000;

    const normalizeStatus = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const isReady = (p: Printer) => normalizeStatus(p.status) === 'ready';
    const isIdle = (p: Printer) => normalizeStatus(p.status) === 'idle';

    const isPrinterBusy = (p: Printer) => {
      const s = normalizeStatus(p.status);
      return s === 'busy' || s.includes('busy');
    };

    const heaterState = (current?: number | null, target?: number | null): 'off' | 'on' | 'heating' => {
      const t = Number(target ?? 0);
      const c = Number(current ?? 0);
      if (!Number.isFinite(t) || t <= 0) return 'off';
      if (Number.isFinite(c) && c < (t - 2)) return 'heating';
      return 'on';
    };

    const heaterStateClass = (current?: number | null, target?: number | null) => {
      const state = heaterState(current, target);
      if (state === 'heating') return 'heater-heating';
      if (state === 'on') return 'heater-on';
      return 'heater-off';
    };

    const rawIsPrinting = (p: Printer) => {
      const s = normalizeStatus(p.status);
      if (s !== 'printing') return false;
      return true;
    };

    const hasStrongPrintingEvidence = (p: Printer) => {
      const hasProgress =
        typeof p.print_progress === 'number' &&
        p.print_progress > 0 &&
        p.print_progress < 1;
      return rawIsPrinting(p) || hasProgress;
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
    let fetchInFlight = false;
    const statusTimers = new Map<string, number>();

    const byNameThenIp = (a: Printer, b: Printer) => {
      const ah = String(a.hostname || '');
      const bh = String(b.hostname || '');
      const hn = ah.localeCompare(bh, undefined, { sensitivity: 'base' });
      if (hn !== 0) return hn;
      return String(a.ip || '').localeCompare(String(b.ip || ''), undefined, { sensitivity: 'base' });
    };

    const syncCustomOrderWithPrinters = () => {
      const ips = printers.value.map((p) => p.ip);
      const kept = customOrder.value.filter((ip) => ips.includes(ip));
      const missing = ips.filter((ip) => !kept.includes(ip));
      customOrder.value = [...kept, ...missing];
    };

    const sortedPrinters = computed(() => {
      if (sortMode.value === 'alphabetical') {
        return [...printers.value].sort(byNameThenIp);
      }

      if (sortMode.value === 'custom') {
        const rank = new Map<string, number>(customOrder.value.map((ip, idx) => [ip, idx]));
        return [...printers.value].sort((a, b) => {
          const ar = rank.get(a.ip);
          const br = rank.get(b.ip);
          const ai = ar === undefined ? Number.MAX_SAFE_INTEGER : ar;
          const bi = br === undefined ? Number.MAX_SAFE_INTEGER : br;
          if (ai !== bi) return ai - bi;
          return byNameThenIp(a, b);
        });
      }

      const printing = (p: Printer) => isPrinterPrinting(p);
      return [...printers.value].sort((a, b) => {
        const ap = printing(a);
        const bp = printing(b);

        if (ap !== bp) return ap ? 1 : -1;
        return byNameThenIp(a, b);
      });
    });

    const customOrderPrinters = computed(() => {
      return customOrder.value
        .map((ip) => printers.value.find((p) => p.ip === ip))
        .filter((p): p is Printer => !!p);
    });

    const moveCustomOrder = (ip: string, delta: -1 | 1) => {
      const idx = customOrder.value.indexOf(ip);
      if (idx < 0) return;
      const next = idx + delta;
      if (next < 0 || next >= customOrder.value.length) return;
      const arr = [...customOrder.value];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      customOrder.value = arr;
    };

    const moveCustomOrderUp = (ip: string) => moveCustomOrder(ip, -1);
    const moveCustomOrderDown = (ip: string) => moveCustomOrder(ip, 1);

    const loadSortSettings = () => {
      try {
        const rawMode = localStorage.getItem(SORT_MODE_KEY);
        if (rawMode === 'dynamic' || rawMode === 'alphabetical' || rawMode === 'custom') {
          sortMode.value = rawMode;
        }

        const rawOrder = localStorage.getItem(SORT_ORDER_KEY);
        if (rawOrder) {
          const parsed = JSON.parse(rawOrder);
          if (Array.isArray(parsed)) {
            customOrder.value = parsed.filter((x) => typeof x === 'string');
          }
        }
      } catch (e) {
        console.warn('Failed to load sort settings:', e);
      }
    };

    const persistSortSettings = () => {
      try {
        localStorage.setItem(SORT_MODE_KEY, sortMode.value);
        localStorage.setItem(SORT_ORDER_KEY, JSON.stringify(customOrder.value));
      } catch (e) {
        console.warn('Failed to persist sort settings:', e);
      }
    };

    watch(sortMode, () => persistSortSettings());
    watch(customOrder, () => persistSortSettings(), { deep: true });

    const viewType = ref('grid');

    const mergePreferGood = <T extends Record<string, any>>(oldObj: T, incoming: Partial<T>): T => {
      const out: any = { ...oldObj };

      for (const [k, v] of Object.entries(incoming)) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'string' && v.trim().length === 0 && k !== 'file_path') continue;
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

      if (typeof p.status === 'string' && p.status.trim().length > 0) c.lastKnownStatus = p.status;
      if (typeof p.state_message === 'string' && p.state_message.trim().length > 0) c.lastKnownStateMessage = p.state_message;
      if (typeof p.file_path === 'string' && p.file_path.trim().length > 0) c.lastKnownFilePath = p.file_path;

      const stableStatus =
        (typeof p.status === 'string' && p.status.trim().length > 0) ? p.status : (c.lastKnownStatus ?? p.status);

      const stableStateMessage =
        (typeof p.state_message === 'string' && p.state_message.trim().length > 0)
          ? p.state_message
          : (c.lastKnownStateMessage ?? p.state_message);

      const stableFilePath =
        (typeof p.file_path === 'string')
          ? p.file_path
          : (c.lastKnownFilePath ?? p.file_path);

      if (strong) c.lastPrintingAt = now;

      const wasRecentlyPrinting =
        typeof c.lastPrintingAt === 'number' && (now - c.lastPrintingAt) < PRINTING_GRACE_MS;

      const derived_printing = raw || wasRecentlyPrinting;
      const visibleFilePath = derived_printing ? stableFilePath : '';

      return {
        ...p,
        status: stableStatus,
        state_message: stableStateMessage,
        file_path: visibleFilePath,
        derived_printing,
      };
    };

    const fetchPrinters = async (opts?: { force?: boolean }) => {
      if (fetchInFlight) return;
      fetchInFlight = true;
      try {
        const force = !!opts?.force;
        const cidr = scannerCidr.value;
        const path = force ? `/api/devices?force=1&cidr=${encodeURIComponent(cidr)}` : `/api/devices?cidr=${encodeURIComponent(cidr)}`;
        const data = await apiFetch<Printer[]>(path);
        await updatePrinters(data);
        isLoading.value = false;
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        fetchInFlight = false;
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

      printers.value = uniquePrinters.map(applyDerivedPrinting);
      syncCustomOrderWithPrinters();

      const nextBaseMap: Record<string, string> = {};
      printers.value.forEach((printer) => {
        if (printer.ip && printer.base_url) nextBaseMap[printer.ip] = printer.base_url;
      });
      printerBaseUrlByIp.value = nextBaseMap;

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

    const selectLockedPrinter = (printer: Printer) => {
      if (!isPrinterLocked(printer)) return;

      const unlocked = new Set(unlockedWhilePrinting.value);
      unlocked.add(printer.ip);
      unlockedWhilePrinting.value = unlocked;

      if (!selectedPrinters.value.includes(printer.ip)) {
        selectedPrinters.value.push(printer.ip);
      }
    };

    const getTransientStatus = (printer: Printer) => {
      if (!selectedPrinters.value.includes(printer.ip)) return '';
      return printerTransientStatusByIp.value[printer.ip] || '';
    };

    const transientStatusClass = (printer: Printer) => {
      const msg = getTransientStatus(printer).toLowerCase();
      if (msg.includes('emergency stop')) return 'text-red';
      if (msg.includes('temperature') || msg.includes('cooldown')) return 'text-cyan';
      return 'text-yellow';
    };

    const setTransientStatusForIps = (ips: string[], message: string, ttlMs = 8_000) => {
      if (!ips.length) return;
      const next = { ...printerTransientStatusByIp.value };
      ips.forEach((ip) => {
        next[ip] = message;
        const prev = statusTimers.get(ip);
        if (typeof prev === 'number') clearTimeout(prev);
        const timer = window.setTimeout(() => {
          const cur = { ...printerTransientStatusByIp.value };
          delete cur[ip];
          printerTransientStatusByIp.value = cur;
          statusTimers.delete(ip);
        }, ttlMs);
        statusTimers.set(ip, timer);
      });
      printerTransientStatusByIp.value = next;
    };

    const getFileAvailability = (printer: Printer): FileAvailability => {
      if (!selectedFileName.value) return 'checking';
      return selectedFileAvailabilityByIp.value[printer.ip] || 'checking';
    };

    const fileAvailabilityClass = (printer: Printer) => {
      const s = getFileAvailability(printer);
      if (s === 'exists') return 'file-exists';
      if (s === 'missing') return 'file-missing';
      if (s === 'error') return 'file-error';
      return 'file-checking';
    };

    const fileAvailabilityIcon = (printer: Printer) => {
      const s = getFileAvailability(printer);
      if (s === 'exists') return 'mdi-check-circle';
      if (s === 'missing') return 'mdi-close-circle';
      if (s === 'error') return 'mdi-alert-circle';
      return 'mdi-progress-clock';
    };

    const fileAvailabilityLabel = (printer: Printer) => {
      const s = getFileAvailability(printer);
      if (s === 'exists') return 'Selected file found';
      if (s === 'missing') return 'Selected file missing';
      if (s === 'error') return 'Cannot verify selected file';
      return 'Checking selected file...';
    };

    const checkFileExistsOnPrinter = async (baseUrl: string, filename: string): Promise<FileAvailability> => {
      const target = String(baseUrl || '').trim();
      const file = String(filename || '').trim();
      if (!target || !file) return 'missing';

      try {
        const metadataRes = await fetch(`${target}/server/files/metadata?filename=${encodeURIComponent(file)}`);
        if (metadataRes.ok) {
          const data = await metadataRes.json().catch(() => ({}));
          if ((data as any)?.error) return 'missing';
          return 'exists';
        }
        if (metadataRes.status === 404) return 'missing';
      } catch {
      }

      try {
        const listRes = await fetch(`${target}/server/files/list?root=gcodes`);
        if (!listRes.ok) return 'error';
        const raw = await listRes.json().catch(() => ({}));

        const files = Array.isArray(raw)
          ? raw
          : Array.isArray((raw as any)?.result)
            ? (raw as any).result
            : Array.isArray((raw as any)?.files)
              ? (raw as any).files
              : [];

        const needle = file.toLowerCase();
        const exists = files.some((entry: any) => {
          const p = String(entry?.path ?? entry?.filename ?? '').trim().toLowerCase();
          return p === needle;
        });

        return exists ? 'exists' : 'missing';
      } catch {
        return 'error';
      }
    };

    const refreshSelectedFileAvailability = async () => {
      const runId = ++fileAvailabilityRun;
      const file = selectedFileName.value;
      const snapshot = printers.value.map((p) => ({ ip: p.ip, base_url: p.base_url }));

      if (!file) {
        selectedFileAvailabilityByIp.value = {};
        return;
      }

      const initial: Record<string, FileAvailability> = {};
      snapshot.forEach((p) => {
        initial[p.ip] = 'checking';
      });
      selectedFileAvailabilityByIp.value = initial;

      const resolved = await Promise.all(
        snapshot.map(async (p) => {
          const state = await checkFileExistsOnPrinter(p.base_url, file);
          return { ip: p.ip, state };
        })
      );

      if (runId !== fileAvailabilityRun) return;

      const next: Record<string, FileAvailability> = {};
      resolved.forEach(({ ip, state }) => {
        next[ip] = state;
      });
      selectedFileAvailabilityByIp.value = next;
    };

    const fileCheckPrinterSignature = computed(() => {
      return printers.value
        .map((p) => `${p.ip}|${p.base_url}`)
        .sort()
        .join(';');
    });

    watch(
      [selectedFileName, fileCheckPrinterSignature],
      () => {
        void refreshSelectedFileAvailability();
      },
      { immediate: true }
    );

    const formatFileName = (filePath: string | null): string => {
      if (!filePath) return "Not Printing";
      const prefix = "/home/pi/printer_data/gcodes/";
      return filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath;
    };

    onMounted(() => {
      loadSortSettings();
      fetchPrinters();
      fetchInterval = window.setInterval(fetchPrinters, POLL_INTERVAL_MS);
    });

    onBeforeUnmount(() => {
      fileAvailabilityRun++;
      if (fetchInterval) clearInterval(fetchInterval);
      statusTimers.forEach((timer) => clearTimeout(timer));
      statusTimers.clear();
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

    const resolvePrinterBase = (printerRef: string): string => {
      const mapped = printerBaseUrlByIp.value[printerRef] || printerRef;
      if (mapped.startsWith('http://') || mapped.startsWith('https://')) return mapped;
      if (mapped.includes(':')) return `http://${mapped}`;
      return `http://${mapped}:7125`;
    };

    const emergencyStopSelected = async () => {
      if (selectedPrinters.value.length === 0) return;

      const results = await Promise.all(
        selectedPrinters.value.map(async (ip) => {
          const base = resolvePrinterBase(ip);
          try {
            const res = await fetch(`${base}/printer/emergency_stop`, { method: 'POST' });
            if (!res.ok) throw new Error(`ESTOP failed (${res.status})`);
            return { ip, success: true };
          } catch {
            try {
              const fallback = await fetch(`${base}/printer/gcode/script?script=${encodeURIComponent('M112')}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              if (!fallback.ok) throw new Error(`M112 fallback failed (${fallback.status})`);
              return { ip, success: true };
            } catch {
              return { ip, success: false };
            }
          }
        })
      );

      const failed = results.filter(r => !r.success);
      const okIps = results.filter(r => r.success).map(r => r.ip);
      const failedIps = failed.map(f => f.ip);
      if (okIps.length) setTransientStatusForIps(okIps, 'Emergency stop sent');
      if (failedIps.length) setTransientStatusForIps(failedIps, 'Emergency stop failed');
    };

    return {
      viewType,
      printers,
      sortedPrinters,
      showSortSettings,
      sortMode,
      customOrderPrinters,
      moveCustomOrderUp,
      moveCustomOrderDown,
      isLoading,
      selectedPrinters,
      toggleSelection,
      selectLockedPrinter,
      getTransientStatus,
      transientStatusClass,
      selectedFileName,
      fileAvailabilityClass,
      fileAvailabilityIcon,
      fileAvailabilityLabel,
      formatFileName,
      restartFirmware,
      emergencyStopSelected,
      isPrinterBusy,
      heaterStateClass,
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

/* three-column top bar: center toggle stays centered */
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

.estop-btn {
  text-transform: none;
  font-weight: 700;
  letter-spacing: 0.2px;
  box-shadow: 0 0 0 1px rgba(244, 67, 54, 0.25) inset;
}

/* right side utilities */
.top-bar-right {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 8px;
}

.utility-btn { opacity: 0.9; }
.utility-menu { min-width: 260px; }

.custom-order-box {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px;
  margin-top: 8px;
}

.custom-order-list {
  max-height: 260px;
  overflow-y: auto;
}

.custom-order-item {
  border-radius: 8px;
  margin-bottom: 4px;
}

.order-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 50%;
  background: rgba(255, 213, 74, 0.2);
}

.order-actions {
  display: flex;
  gap: 2px;
}

/* Cards */
.floating-card {
  position: relative;
  border-radius: 12px;
  box-shadow: 0px 4px 8px rgba(219, 219, 219, 0.788), 0px 2px 4px rgb(221, 221, 221);
  background-color: surface;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  display: flex;
  flex-direction: column;

  /* ✅ equal height per grid row for aligned heater boxes */
  height: 100%;
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
.text-cyan { color: #52d9ff; }
.text-green { color: green; }
.text-grey { color: grey; }
.text-red { color: red; }

a:link, a:visited { color: rgb(255, 255, 255); text-decoration: none; }
a:hover { color: #FFDF00; }
a:active { color: blue; }

.status-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: inline-block;
}

/* body fills the card + uses gap instead of spacer divs */
.card-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 0px;
}

/* ✅ reserved slots to prevent "random big gap" while keeping alignment */
.progress-slot { min-height: 28px; }
.file-slot {
  min-height: 20px;      /* keep your fixed slot */
  height: 20px;
  overflow: hidden;      /* prevents taking extra vertical room */
  display: flex;
  align-items: center;
}

.file-availability-row {
  min-height: 20px;
  display: flex;
  align-items: center;
  margin-top: 2px;
}

.file-availability-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  line-height: 1;
}

.list-file-availability {
  font-size: 0.75rem;
  line-height: 1.1;
  margin-top: 2px;
}

.file-exists { color: #7CFFB2; }
.file-missing { color: #FF8A8A; }
.file-error { color: #FFC107; }
.file-checking { color: #BCBEC0; }



.status-stack {
  display: flex;
  flex-direction: column;
  gap: 0px;
  margin-top: auto;
  margin-bottom: 0px;
}
.status-sub {
  min-height: 0px;
  font-size: 0.85rem;
  line-height: 1.1;
  margin: 0;
}

.temperature-container {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 0;

  /* pinned + tight */
  margin: 0px 0 0;
  margin-top: 0px !important;
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
.temp-icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.heater-indicator {
  position: absolute;
  right: -6px;
  top: -2px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 0 0 1px rgba(0,0,0,0.25);
}
.heater-off { background: #9e9e9e; }
.heater-on { background: #4caf50; }
.heater-heating {
  background: #ffb300;
  box-shadow: 0 0 8px rgba(255, 179, 0, 0.8);
}
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

.v-container {
  padding-top: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.printer-list-root {
  width: 100%;
  max-width: 100%;
  margin: 0;
  overflow-x: hidden;
}
</style>
