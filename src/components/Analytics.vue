<template>
  <v-container fluid class="analytics-root">
    <!-- Header -->
    <div class="analytics-header">
      <div>
        <div class="page-title">Analytics</div>
        <div class="page-subtitle">
          Fleet usage, print history, and calibration summaries.
        </div>
      </div>

      <div class="header-actions">
        <v-btn
          variant="tonal"
          color="yellow"
          size="small"
          @click="refreshAll"
          :loading="loadingAny"
        >
          <v-icon start>mdi-refresh</v-icon>
          Refresh
        </v-btn>
      </div>
    </div>

    <!-- Top summary stats -->
    <div class="metrics-grid">
      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">Fleet</div>
        <div class="metric-value">
          <template v-if="loadingPrinters">—</template>
          <template v-else>{{ printers.length }}</template>
        </div>
        <div class="metric-footnote">Printers discovered</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">Printing Now</div>
        <div class="metric-value">
          <template v-if="loadingPrinters">—</template>
          <template v-else>{{ printingNowCount }}</template>
        </div>
        <div class="metric-footnote">Actively printing</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">Total Prints</div>
        <div class="metric-value">
          <template v-if="loadingMetrics">—</template>
          <template v-else>{{ metrics?.summary?.total_prints ?? '—' }}</template>
        </div>
        <div class="metric-footnote">Jobs recorded</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">Total Print Time</div>
        <div class="metric-value">
          <template v-if="loadingMetrics">—</template>
          <template v-else>{{ humanHours(metrics?.summary?.total_print_time_hours) }}</template>
        </div>
        <div class="metric-footnote">Across all jobs</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">Average Job</div>
        <div class="metric-value">
          <template v-if="loadingMetrics">—</template>
          <template v-else>{{ humanHours(metrics?.summary?.avg_print_time_hours) }}</template>
        </div>
        <div class="metric-footnote">Mean duration</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">Longest Job</div>
        <div class="metric-value">
          <template v-if="loadingMetrics">—</template>
          <template v-else>{{ humanHours(metrics?.summary?.longest_print_hours) }}</template>
        </div>
        <div class="metric-footnote">
          {{ metrics?.summary?.longest_print_name || 'Longest recorded print' }}
        </div>
      </v-card>
    </div>

    <!-- Time breakdown -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">Time Breakdown by Status</div>
          <div class="section-sub">
            Share of total print time spent on completed, cancelled/shutdown, and error jobs.
          </div>
        </div>
      </div>

      <template v-if="loadingMetrics">
        <v-skeleton-loader type="heading, paragraph" :loading="true" />
      </template>

      <template v-else-if="!metrics?.summary">
        <div class="empty">No metrics available yet.</div>
      </template>

      <template v-else>
        <div class="status-bar">
          <div
            class="status-seg completed"
            :style="{ width: segPct(timeH.completed) }"
          />
          <div
            class="status-seg error"
            :style="{ width: segPct(timeH.error) }"
          />
          <div
            class="status-seg cancelled"
            :style="{ width: segPct(timeH.cancelled) }"
          />
          <div
            class="status-seg other"
            :style="{ width: segPct(timeH.other) }"
          />
        </div>

        <div class="legend">
          <div class="legend-item">
            <span class="dot completed" /> Completed:
            <strong>{{ counts.completed ?? 0 }}</strong>
            · {{ pct(timeH.completed) }} ({{ humanHours(timeH.completed) }})
          </div>
          <div class="legend-item">
            <span class="dot cancelled" /> Cancelled / Shutdown:
            <strong>{{ counts.cancelled ?? 0 }}</strong>
            · {{ pct(timeH.cancelled) }} ({{ humanHours(timeH.cancelled) }})
          </div>
          <div class="legend-item">
            <span class="dot error" /> Error:
            <strong>{{ counts.error ?? 0 }}</strong>
            · {{ pct(timeH.error) }} ({{ humanHours(timeH.error) }})
          </div>
          <div class="legend-item">
            <span class="dot other" /> Other:
            <strong>{{ counts.other ?? 0 }}</strong>
            · {{ pct(timeH.other) }} ({{ humanHours(timeH.other) }})
          </div>
        </div>

        <div class="last-print">
          Last recorded print:
          <span class="mono">{{ formatDateShort(metrics.summary.last_print_finished) }}</span>
        </div>
      </template>
    </v-card>

    <!-- Hours by month -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">Print Hours by Month</div>
          <div class="section-sub">
            Relative print hours in each recorded month (scaled to the busiest period).
          </div>
        </div>
      </div>

      <template v-if="loadingMetrics">
        <v-skeleton-loader type="heading, image" :loading="true" />
      </template>

      <template v-else-if="!periods.length || maxPeriodHours <= 0">
        <div class="empty">No period breakdown available yet.</div>
      </template>

      <template v-else>
        <div class="chart-wrap">
          <div class="chart-bars">
            <div
              v-for="p in periods"
              :key="p.label"
              class="chart-bar"
              :style="{ height: barHeightPct(p.hours) }"
            >
              <div class="bar-value">{{ (p.hours ?? 0).toFixed(1) }}</div>
            </div>
          </div>

          <div class="chart-axis">
            <div
              v-for="p in periods"
              :key="p.label + '-axis'"
              class="chart-label"
              :title="p.label"
            >
              {{ p.label }}
            </div>
          </div>

          <div class="chart-caption">
            Taller bars indicate months with more accumulated print time.
          </div>
        </div>
      </template>
    </v-card>

    <!-- Calibration profiles -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">Calibration Profiles</div>
          <div class="section-sub">
            Grouped by machine + material, with left/right extruder tuned values.
          </div>
        </div>

        <div class="pill-row">
          <div class="pill">
            <span class="pill-label">Profiles</span>
            <span class="pill-value">{{ profileCount }}</span>
          </div>
        </div>
      </div>

      <template v-if="loadingProfiles">
        <v-skeleton-loader type="heading, list-item, list-item, list-item" :loading="true" />
      </template>

      <template v-else-if="!profileGroups.length">
        <div class="empty">No calibration profiles found.</div>
      </template>

      <template v-else>
        <div class="profile-grid">
          <div
            v-for="g in profileGroups"
            :key="g.key"
            class="profile-card"
          >
            <div class="profile-header">
              <div>
                <div class="profile-name">{{ g.machine }}</div>
                <div class="profile-tagline">
                  Material: <strong>{{ g.material }}</strong>
                  · Extruders:
                  {{ g.left ? 'Left' : '—' }}/{{ g.right ? 'Right' : '—' }}
                </div>
              </div>

              <div class="profile-header-right">
                <div class="pill pill-material" v-if="g.material">
                  <span class="pill-label">Material</span>
                  <span class="pill-value">{{ g.material }}</span>
                </div>
              </div>
            </div>

            <div class="profile-extruders">
              <div class="extruder-slot">
                <div class="slot-title">Left Extruder</div>
                <template v-if="g.left">
                  <div class="slot-subtitle">{{ (g.left.extruder || 'left') }}</div>

                  <div class="slot-meta">
                    <div class="pill pill-hot">
                      <span class="pill-label">Nozzle</span>
                      <span class="pill-value">{{ fmtTemp(g.left.hotend) }}</span>
                    </div>
                    <div class="pill pill-bed">
                      <span class="pill-label">Bed</span>
                      <span class="pill-value">{{ fmtTemp(g.left.bed) }}</span>
                    </div>
                  </div>

                  <div class="kv-rows">
                    <div class="kv-row">
                      <div class="kv-label">Flow Multiplier</div>
                      <div class="kv-val mono">{{ fmtNum(g.left.flow, 3) }}</div>
                    </div>
                    <div class="kv-row">
                      <div class="kv-label">Pressure Advance (K)</div>
                      <div class="kv-val mono">{{ fmtNum(g.left.pressure_advance, 4) }}</div>
                    </div>
                  </div>

                  <div class="slot-updated" v-if="lastUpdated(g.left)">
                    Last updated: {{ formatDateShort(lastUpdated(g.left)!) }}
                  </div>

                  <div class="slot-notes" v-if="notesText(g.left)">
                    {{ notesText(g.left) }}
                  </div>
                </template>
                <template v-else>
                  <div class="slot-empty">No left extruder profile saved yet.</div>
                </template>
              </div>

              <div class="extruder-slot">
                <div class="slot-title">Right Extruder</div>
                <template v-if="g.right">
                  <div class="slot-subtitle">{{ (g.right.extruder || 'right') }}</div>

                  <div class="slot-meta">
                    <div class="pill pill-hot">
                      <span class="pill-label">Nozzle</span>
                      <span class="pill-value">{{ fmtTemp(g.right.hotend) }}</span>
                    </div>
                    <div class="pill pill-bed">
                      <span class="pill-label">Bed</span>
                      <span class="pill-value">{{ fmtTemp(g.right.bed) }}</span>
                    </div>
                  </div>

                  <div class="kv-rows">
                    <div class="kv-row">
                      <div class="kv-label">Flow Multiplier</div>
                      <div class="kv-val mono">{{ fmtNum(g.right.flow, 3) }}</div>
                    </div>
                    <div class="kv-row">
                      <div class="kv-label">Pressure Advance (K)</div>
                      <div class="kv-val mono">{{ fmtNum(g.right.pressure_advance, 4) }}</div>
                    </div>
                  </div>

                  <div class="slot-updated" v-if="lastUpdated(g.right)">
                    Last updated: {{ formatDateShort(lastUpdated(g.right)!) }}
                  </div>

                  <div class="slot-notes" v-if="notesText(g.right)">
                    {{ notesText(g.right) }}
                  </div>
                </template>
                <template v-else>
                  <div class="slot-empty">No right extruder profile saved yet.</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-card>

    <!-- Errors -->
    <v-alert
      v-if="errorMsg"
      type="error"
      variant="tonal"
      class="mt-4"
    >
      {{ errorMsg }}
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

type Printer = {
  hostname: string;
  ip: string;
  status: string;
  state_message?: string;
  print_progress?: number;
  file_path?: string;
};

type PrintMetricsResponse = {
  summary?: {
    total_print_time_hours?: number;
    total_prints?: number;
    avg_print_time_hours?: number;
    longest_print_hours?: number;
    longest_print_name?: string;
    last_print_finished?: string;
    status_breakdown?: Record<string, number>;
    status_time_hours?: Record<string, number>;
  };
  by_period?: Array<{ label: string; hours: number }>;
};

type CalibrationProfile = {
  machine?: string;
  material?: string;
  extruder?: string; // 'left'|'right'
  hotend?: number;
  bed?: number;
  flow?: number;
  pressure_advance?: number;

  flow_notes?: string;
  pressure_advance_notes?: string;

  flow_updated_at?: string;
  pressure_advance_updated_at?: string;
};

type CalibrationReportResponse = {
  profiles?: CalibrationProfile[];
};

const errorMsg = ref<string>('');

const printers = ref<Printer[]>([]);
const metrics = ref<PrintMetricsResponse | null>(null);
const profiles = ref<CalibrationProfile[]>([]);

const loadingPrinters = ref(true);
const loadingMetrics = ref(true);
const loadingProfiles = ref(true);

const loadingAny = computed(() => loadingPrinters.value || loadingMetrics.value || loadingProfiles.value);

const normalizeStatus = (s?: string) => (s ?? '').trim().toLowerCase();

const isPrinterPrintingNow = (p: Printer) => {
  const s = normalizeStatus(p.status);
  if (s !== 'printing') return false;
  const hasProgress = typeof p.print_progress === 'number' && p.print_progress > 0;
  const hasFile = typeof p.file_path === 'string' && p.file_path.trim().length > 0;
  return hasProgress || hasFile;
};

const printingNowCount = computed(() => printers.value.filter(isPrinterPrintingNow).length);

const counts = computed<Record<string, number>>(() => metrics.value?.summary?.status_breakdown ?? {});
const timeH = computed<Record<string, number>>(() => metrics.value?.summary?.status_time_hours ?? {});

const totalTimeHours = computed(() => {
  const t = timeH.value;
  return (t.completed ?? 0) + (t.cancelled ?? 0) + (t.error ?? 0) + (t.other ?? 0);
});

const segPct = (h?: number) => {
  const total = totalTimeHours.value;
  if (!total || total <= 0) return '0%';
  const v = Math.max(0, Number(h ?? 0));
  return `${Math.min(100, (v / total) * 100)}%`;
};

const pct = (h?: number) => {
  const total = totalTimeHours.value;
  if (!total || total <= 0) return '0.0%';
  const v = Math.max(0, Number(h ?? 0));
  return `${((v / total) * 100).toFixed(1)}%`;
};

const periods = computed(() => metrics.value?.by_period ?? []);
const maxPeriodHours = computed(() => Math.max(0, ...periods.value.map(p => Number(p.hours ?? 0))));

const barHeightPct = (hours?: number) => {
  const maxH = maxPeriodHours.value;
  const h = Math.max(0, Number(hours ?? 0));
  if (!maxH || maxH <= 0) return '0%';
  // min visible bar
  const pct = Math.max(4, (h / maxH) * 100);
  return `${pct}%`;
};

// ---- Calibration grouping (machine + material, left/right)
type ProfileGroup = {
  key: string;
  machine: string;
  material: string;
  left: CalibrationProfile | null;
  right: CalibrationProfile | null;
};

const profileGroups = computed<ProfileGroup[]>(() => {
  const map = new Map<string, ProfileGroup>();

  for (const p of profiles.value) {
    const machine = (p.machine ?? 'Unknown machine').trim() || 'Unknown machine';
    const material = (p.material ?? 'Unspecified').trim() || 'Unspecified';
    const extruder = (p.extruder ?? '').toString().toLowerCase().trim();

    const key = `${machine}||${material}`;
    if (!map.has(key)) {
      map.set(key, { key, machine, material, left: null, right: null });
    }
    const g = map.get(key)!;

    if (extruder === 'left') g.left = p;
    else if (extruder === 'right') g.right = p;
  }

  return Array.from(map.values());
});

const profileCount = computed(() => profiles.value.length);

// ---- Helpers (formatting)
const fmtTemp = (v?: number) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return `${Number(v)} °C`;
};

const fmtNum = (v?: number, digits = 3) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toFixed(digits);
};

const humanHours = (h?: number) => {
  if (h === null || h === undefined || Number.isNaN(Number(h))) return '—';
  const totalSec = Math.max(0, Math.round(Number(h) * 3600));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (hours === 0 && mins === 0) parts.push(`${secs}s`);
  return parts.join(' ');
};

const formatDateShort = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const unescapeHex = (str?: string) => {
  if (!str) return '';
  return String(str).replace(/\\x([0-9A-Fa-f]{2})/g, (_, hh) => String.fromCharCode(parseInt(hh, 16)));
};

const notesText = (p: CalibrationProfile) => {
  const bits: string[] = [];
  if (p.flow_notes) bits.push(`Flow: ${unescapeHex(p.flow_notes)}`);
  if (p.pressure_advance_notes) bits.push(`PA: ${unescapeHex(p.pressure_advance_notes)}`);
  return bits.join(' · ');
};

const lastUpdated = (p: CalibrationProfile) => {
  const f = p.flow_updated_at ?? '';
  const a = p.pressure_advance_updated_at ?? '';
  if (f && a) return f > a ? f : a;
  return f || a || null;
};

// ---- Data loading
const fetchPrinters = async () => {
  loadingPrinters.value = true;
  try {
    const res = await fetch('/api/devices', { cache: 'no-store' });
    if (!res.ok) throw new Error(`devices: ${res.status}`);
    printers.value = await res.json();
  } finally {
    loadingPrinters.value = false;
  }
};

const fetchMetrics = async () => {
  loadingMetrics.value = true;
  try {
    // matches your separate report project
    const res = await fetch('/cgi-bin/get_print_history_metrics.sh', { cache: 'no-store' });
    if (!res.ok) throw new Error(`metrics: ${res.status}`);
    metrics.value = await res.json();
  } finally {
    loadingMetrics.value = false;
  }
};

const fetchProfiles = async () => {
  loadingProfiles.value = true;
  try {
    // matches your separate report project
    const res = await fetch('/cgi-bin/get_calibration_report.sh', { cache: 'no-store' });
    if (!res.ok) throw new Error(`profiles: ${res.status}`);
    const data: CalibrationReportResponse = await res.json();
    profiles.value = data.profiles ?? [];
  } finally {
    loadingProfiles.value = false;
  }
};

const refreshAll = async () => {
  errorMsg.value = '';
  try {
    await Promise.all([fetchPrinters(), fetchMetrics(), fetchProfiles()]);
  } catch (e: any) {
    errorMsg.value = `Analytics refresh failed: ${e?.message ?? String(e)}`;
  }
};

onMounted(() => {
  refreshAll();
});
</script>

<style scoped>
.analytics-root {
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.analytics-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
}

.page-subtitle {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Summary metric cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.metric-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 12px;
  background: radial-gradient(circle at top left, rgba(255, 212, 0, 0.08), transparent 60%);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
}

.metric-label {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.metric-value {
  font-size: 18px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  margin-top: 4px;
}

.metric-footnote {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Section cards */
.section-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 12px;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.35);
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.section-title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
}

.section-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
  font-style: italic;
  padding: 6px 2px;
}

/* Pills (matches your report vibe) */
.pill-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(0, 0, 0, 0.25);
}
.pill-label {
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
}
.pill-value {
  font-weight: 700;
}
.pill-hot { border-color: rgba(255, 189, 0, 0.6); }
.pill-bed { border-color: rgba(255, 255, 255, 0.22); }
.pill-material {
  border-color: rgba(255, 200, 0, 0.7);
  background: linear-gradient(135deg, rgba(27, 21, 5, 0.85), rgba(0, 0, 0, 0.25));
}

/* Status bar */
.status-bar {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.status-seg { height: 100%; }
.status-seg.completed { background: linear-gradient(to right, #FFBD00, #FFD400); }
.status-seg.error { background: linear-gradient(to right, #5b2f35, #7b3b44); }
.status-seg.cancelled { background: linear-gradient(to right, #343447, #4a4a63); }
.status-seg.other { background: linear-gradient(to right, #2c3138, #3b414b); }

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}
.dot.completed { background: linear-gradient(to right, #FFBD00, #FFD400); }
.dot.cancelled { background: linear-gradient(to right, #343447, #4a4a63); }
.dot.error { background: linear-gradient(to right, #5b2f35, #7b3b44); }
.dot.other { background: linear-gradient(to right, #2c3138, #3b414b); }

.last-print {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  color: rgba(255, 255, 255, 0.85);
}

/* Simple bar chart */
.chart-wrap {
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 10px 10px 8px;
}
.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 140px;
}
.chart-bar {
  flex: 1;
  min-width: 10px;
  border-radius: 6px 6px 0 0;
  background: linear-gradient(to top, rgba(255, 179, 0, 0.9), rgba(255, 212, 0, 0.95));
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.bar-value {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.85);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.chart-axis {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  margin-top: 6px;
}
.chart-label {
  flex: 1;
  text-align: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chart-caption {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

/* Profiles */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
.profile-card {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  padding: 10px 12px;
  background: radial-gradient(circle at top left, rgba(255, 212, 0, 0.08), rgba(0, 0, 0, 0.25) 65%);
  position: relative;
  overflow: hidden;
}
.profile-card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #FFD400, #FFB300);
  opacity: 0.9;
}

.profile-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.profile-name {
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  font-size: 14px;
}

.profile-tagline {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin-top: 2px;
}

.profile-header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.profile-extruders {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}

@media (max-width: 820px) {
  .profile-extruders { grid-template-columns: 1fr; }
}

.extruder-slot {
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  padding: 10px 10px;
  min-height: 92px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.28);
}

.slot-title {
  font-size: 11px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.slot-subtitle {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: -2px;
}

.slot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.kv-rows {
  display: grid;
  grid-template-columns: 1fr;
  gap: 3px;
  margin-top: 4px;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.kv-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.kv-val {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
  text-align: right;
  flex: 1;
}

.slot-empty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  font-style: italic;
  margin-top: 4px;
}

.slot-notes {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.70);
  border-top: 1px dashed rgba(255, 255, 255, 0.14);
  padding-top: 6px;
  margin-top: 4px;
}

.slot-updated {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}
</style>
