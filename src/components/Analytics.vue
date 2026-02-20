<template>
  <v-container fluid class="analytics-root">
    <!-- Header -->
    <div class="analytics-header">
      <div>
        <div class="page-title">{{ $t('analytics.title') }}</div>
        <div class="page-subtitle">
          {{ $t('analytics.subtitle') }}
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
          {{ $t('common.refresh') }}
        </v-btn>
      </div>
    </div>

    <!-- Top summary stats -->
    <div class="metrics-grid">
      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">{{ $t('analytics.metrics.fleet') }}</div>
        <div class="metric-value">
          <template v-if="loadingPrinters">—</template>
          <template v-else>{{ printers.length }}</template>
        </div>
        <div class="metric-footnote">{{ $t('analytics.metrics.fleetFootnote') }}</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">{{ $t('analytics.metrics.printingNow') }}</div>
        <div class="metric-value">
          <template v-if="loadingPrinters">—</template>
          <template v-else>{{ printingNowCount }}</template>
        </div>
        <div class="metric-footnote">{{ $t('analytics.metrics.printingNowFootnote') }}</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">{{ $t('analytics.metrics.totalPrints') }}</div>
        <div class="metric-value">
          <template v-if="loadingHistory">—</template>
          <template v-else>{{ historyAgg?.fleet?.total_jobs ?? '—' }}</template>
        </div>
        <div class="metric-footnote">{{ $t('analytics.metrics.acrossAll') }}</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">{{ $t('analytics.metrics.totalPrintTime') }}</div>
        <div class="metric-value">
          <template v-if="loadingHistory">—</template>
          <template v-else>{{ humanDuration(historyAgg?.fleet?.total_print_time) }}</template>
        </div>
        <div class="metric-footnote">{{ $t('analytics.metrics.acrossAll') }}</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">{{ $t('analytics.metrics.totalTimeIncPaused') }}</div>
        <div class="metric-value">
          <template v-if="loadingHistory">—</template>
          <template v-else>{{ humanDuration(historyAgg?.fleet?.total_time) }}</template>
        </div>
        <div class="metric-footnote">{{ $t('analytics.metrics.workTimePaused') }}</div>
      </v-card>

      <v-card class="metric-card" color="#181B20">
        <div class="metric-label">{{ $t('analytics.metrics.filamentUsed') }}</div>
        <div class="metric-value">
          <template v-if="loadingHistory">—</template>
          <template v-else>{{ fmtMeters(historyAgg?.fleet?.total_filament_used) }}</template>
        </div>
        <div class="metric-footnote">{{ $t('analytics.metrics.filamentFootnote') }}</div>
      </v-card>
    </div>

    <!-- Time breakdown (Fleet) -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">{{ $t('analytics.timeBreakdown.title') }}</div>
          <div class="section-sub">
            {{ $t('analytics.timeBreakdown.sub') }}
          </div>
        </div>
      </div>

      <template v-if="loadingHistory">
        <v-skeleton-loader type="heading, paragraph" :loading="true" />
      </template>

      <template v-else-if="!fleetMetrics">
        <div class="empty">{{ $t('analytics.timeBreakdown.empty') }}</div>
      </template>

      <template v-else>
        <div class="status-bar">
          <div class="status-seg completed" :style="{ width: segPct(fleetTimeH.completed) }" />
          <div class="status-seg error" :style="{ width: segPct(fleetTimeH.error) }" />
          <div class="status-seg cancelled" :style="{ width: segPct(fleetTimeH.cancelled) }" />
          <div class="status-seg other" :style="{ width: segPct(fleetTimeH.other) }" />
        </div>

        <div class="legend">
          <div class="legend-item">
            <span class="dot completed" /> {{ $t('analytics.timeBreakdown.completed') }}
            <strong>{{ fleetCounts.completed ?? 0 }}</strong>
            · {{ pct(fleetTimeH.completed) }} ({{ humanDurationHr(fleetTimeH.completed) }})
          </div>
          <div class="legend-item">
            <span class="dot cancelled" /> {{ $t('analytics.timeBreakdown.cancelled') }}
            <strong>{{ fleetCounts.cancelled ?? 0 }}</strong>
            · {{ pct(fleetTimeH.cancelled) }} ({{ humanDurationHr(fleetTimeH.cancelled) }})
          </div>
          <div class="legend-item">
            <span class="dot error" /> {{ $t('analytics.timeBreakdown.error') }}
            <strong>{{ fleetCounts.error ?? 0 }}</strong>
            · {{ pct(fleetTimeH.error) }} ({{ humanDurationHr(fleetTimeH.error) }})
          </div>
          <div class="legend-item">
            <span class="dot other" /> {{ $t('analytics.timeBreakdown.other') }}
            <strong>{{ fleetCounts.other ?? 0 }}</strong>
            · {{ pct(fleetTimeH.other) }} ({{ humanDurationHr(fleetTimeH.other) }})
          </div>
        </div>

        <div class="last-print">
          Last recorded print:
          <span class="mono">{{ formatDateShort(fleetMetrics.last_print_finished) }}</span>
        </div>
      </template>
    </v-card>

    <!-- Hours by month (Fleet) -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">{{ $t('analytics.hoursChart.title') }}</div>
          <div class="section-sub">
            {{ $t('analytics.hoursChart.sub') }}
          </div>
        </div>
      </div>

      <template v-if="loadingHistory">
        <v-skeleton-loader type="heading, image" :loading="true" />
      </template>

      <template v-else-if="!fleetPeriods.length || fleetMaxPeriodHours <= 0">
        <div class="empty">{{ $t('analytics.hoursChart.empty') }}</div>
      </template>

      <template v-else>
        <div class="chart-wrap">
          <div class="chart-bars">
            <div
              v-for="p in fleetPeriods"
              :key="p.label"
              class="chart-bar"
              :style="{ height: barHeightPct(p.hours, fleetMaxPeriodHours) }"
            >
              <div class="bar-value">{{ (p.hours ?? 0).toFixed(1) }}</div>
            </div>
          </div>

          <div class="chart-axis">
            <div
              v-for="p in fleetPeriods"
              :key="p.label + '-axis'"
              class="chart-label"
              :title="p.label"
            >
              {{ p.label }}
            </div>
          </div>

          <div class="chart-caption">
            {{ $t('analytics.hoursChart.caption') }}
          </div>
        </div>
      </template>
    </v-card>

    <!-- Leaderboards -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">{{ $t('analytics.leaderboards.title') }}</div>
          <div class="section-sub">
            {{ $t('analytics.leaderboards.sub') }}
          </div>
        </div>
      </div>

      <template v-if="loadingHistory">
        <v-skeleton-loader type="heading, paragraph" :loading="true" />
      </template>

      <template v-else-if="!historyAgg?.by_printer?.length">
        <div class="empty">{{ $t('analytics.leaderboards.empty') }}</div>
      </template>

      <template v-else>
        <div class="metrics-grid" style="margin-top: 4px;">
          <v-card class="metric-card" color="#181B20">
            <div class="metric-label">{{ $t('analytics.leaderboards.longestJob') }}</div>
            <div class="metric-value">{{ humanDuration(fleetLongestJobSeconds) }}</div>
            <div class="metric-footnote">
              <strong>{{ fleetLongestJobPrinter || '—' }}</strong>
              <span v-if="fleetLongestJobFile"> · {{ fleetLongestJobFile }}</span>
            </div>
          </v-card>

          <v-card class="metric-card" color="#181B20">
            <div class="metric-label">{{ $t('analytics.leaderboards.mostPrintTime') }}</div>
            <div class="metric-value">{{ humanDuration(topByPrintTimeSeconds) }}</div>
            <div class="metric-footnote">
              <strong>{{ topByPrintTimePrinter || '—' }}</strong>
            </div>
          </v-card>

          <v-card class="metric-card" color="#181B20">
            <div class="metric-label">{{ $t('analytics.leaderboards.mostPrints') }}</div>
            <div class="metric-value">{{ topByPrintCount }}</div>
            <div class="metric-footnote">
              <strong>{{ topByPrintCountPrinter || '—' }}</strong>
            </div>
          </v-card>
        </div>
      </template>
    </v-card>

    <!-- Per-printer totals table -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">{{ $t('analytics.perPrinter.title') }}</div>
          <div class="section-sub">
            {{ $t('analytics.perPrinter.sub') }}
          </div>
        </div>
      </div>

      <template v-if="loadingHistory">
        <v-skeleton-loader type="table" :loading="true" />
      </template>

      <template v-else-if="!historyAgg?.by_printer?.length">
        <div class="empty">{{ $t('analytics.perPrinter.empty') }}</div>
      </template>

      <template v-else>
        <v-data-table
          :items="historyTableRows"
          :headers="historyHeaders"
          density="compact"
          class="history-table"
          :items-per-page="10"
        >
          <template #item.total_print_time="{ item }">
            <span class="mono">{{ humanDuration(item.total_print_time) }}</span>
          </template>

          <template #item.total_time="{ item }">
            <span class="mono">{{ humanDuration(item.total_time) }}</span>
          </template>

          <template #item.total_filament_used="{ item }">
            <span class="mono">{{ fmtMeters(item.total_filament_used) }}</span>
          </template>

          <template #item.longest_job="{ item }">
            <div class="mono">{{ humanDuration(item.longest_job) }}</div>
            <div class="tiny" v-if="item.longest_job_file">{{ item.longest_job_file }}</div>
          </template>

          <template #item.ok="{ item }">
            <v-chip size="x-small" :color="item.ok ? 'green' : 'red'" variant="tonal">
              {{ item.ok ? 'OK' : 'ERR' }}
            </v-chip>
          </template>

          <template #item.error="{ item }">
            <span class="tiny" v-if="item.error">{{ item.error }}</span>
            <span v-else class="tiny">—</span>
          </template>
        </v-data-table>
      </template>
    </v-card>

    <!-- Calibration profiles -->
    <v-card class="section-card" color="#181B20">
      <div class="section-head">
        <div>
          <div class="section-title">{{ $t('analytics.calibration.title') }}</div>
          <div class="section-sub">
            {{ $t('analytics.calibration.sub') }}
          </div>
        </div>

        <div class="pill-row">
          <div class="pill">
            <span class="pill-label">{{ $t('analytics.calibration.profilesLabel') }}</span>
            <span class="pill-value">{{ profileCount }}</span>
          </div>
        </div>
      </div>

      <template v-if="loadingProfiles">
        <v-skeleton-loader type="heading, list-item, list-item, list-item" :loading="true" />
      </template>

      <template v-else-if="!profileGroups.length">
        <div class="empty">{{ $t('analytics.calibration.empty') }}</div>
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
                  {{ $t('analytics.calibration.material') }} <strong>{{ g.material }}</strong>
                  · {{ $t('analytics.calibration.extruders') }}
                  {{ g.left ? $t('analytics.calibration.leftLabel') : '—' }}/{{ g.right ? $t('analytics.calibration.rightLabel') : '—' }}
                </div>
              </div>

              <div class="profile-header-right">
                <div class="pill pill-material" v-if="g.material">
                  <span class="pill-label">{{ $t('analytics.calibration.materialLabel') }}</span>
                  <span class="pill-value">{{ g.material }}</span>
                </div>
              </div>
            </div>

            <div class="profile-extruders">
                <div class="extruder-slot">
                <div class="slot-title">{{ $t('analytics.calibration.leftExtruder') }}</div>
                <template v-if="g.left">
                  <div class="slot-subtitle">{{ (g.left.extruder || 'left') }}</div>

                  <div class="slot-meta">
                    <div class="pill pill-hot">
                      <span class="pill-label">{{ $t('analytics.calibration.nozzle') }}</span>
                      <span class="pill-value">{{ fmtTemp(g.left.hotend) }}</span>
                    </div>
                    <div class="pill pill-bed">
                      <span class="pill-label">{{ $t('analytics.calibration.bed') }}</span>
                      <span class="pill-value">{{ fmtTemp(g.left.bed) }}</span>
                    </div>
                  </div>

                  <div class="kv-rows">
                    <div class="kv-row">
                      <div class="kv-label">{{ $t('analytics.calibration.flowMultiplier') }}</div>
                      <div class="kv-val mono">{{ fmtNum(g.left.flow, 3) }}</div>
                    </div>
                    <div class="kv-row">
                      <div class="kv-label">{{ $t('analytics.calibration.pressureAdvance') }}</div>
                      <div class="kv-val mono">{{ fmtNum(g.left.pressure_advance, 4) }}</div>
                    </div>
                  </div>

                  <div class="slot-updated" v-if="lastUpdated(g.left)">
                    {{ $t('analytics.calibration.lastUpdated') }} {{ formatDateShort(lastUpdated(g.left)!) }}
                  </div>

                  <div class="slot-notes" v-if="notesText(g.left)">
                    {{ notesText(g.left) }}
                  </div>
                </template>
                <template v-else>
                  <div class="slot-empty">{{ $t('analytics.calibration.noLeftProfile') }}</div>
                </template>
              </div>

              <div class="extruder-slot">
                <div class="slot-title">{{ $t('analytics.calibration.rightExtruder') }}</div>
                <template v-if="g.right">
                  <div class="slot-subtitle">{{ (g.right.extruder || 'right') }}</div>

                  <div class="slot-meta">
                    <div class="pill pill-hot">
                      <span class="pill-label">{{ $t('analytics.calibration.nozzle') }}</span>
                      <span class="pill-value">{{ fmtTemp(g.right.hotend) }}</span>
                    </div>
                    <div class="pill pill-bed">
                      <span class="pill-label">{{ $t('analytics.calibration.bed') }}</span>
                      <span class="pill-value">{{ fmtTemp(g.right.bed) }}</span>
                    </div>
                  </div>

                  <div class="kv-rows">
                    <div class="kv-row">
                      <div class="kv-label">{{ $t('analytics.calibration.flowMultiplier') }}</div>
                      <div class="kv-val mono">{{ fmtNum(g.right.flow, 3) }}</div>
                    </div>
                    <div class="kv-row">
                      <div class="kv-label">{{ $t('analytics.calibration.pressureAdvance') }}</div>
                      <div class="kv-val mono">{{ fmtNum(g.right.pressure_advance, 4) }}</div>
                    </div>
                  </div>

                  <div class="slot-updated" v-if="lastUpdated(g.right)">
                    {{ $t('analytics.calibration.lastUpdated') }} {{ formatDateShort(lastUpdated(g.right)!) }}
                  </div>

                  <div class="slot-notes" v-if="notesText(g.right)">
                    {{ notesText(g.right) }}
                  </div>
                </template>
                <template v-else>
                  <div class="slot-empty">{{ $t('analytics.calibration.noRightProfile') }}</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </template>
    </v-card>

    <!-- Errors -->
    <v-alert v-if="errorMsg" type="error" variant="tonal" class="mt-4">
      {{ errorMsg }}
    </v-alert>
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

type Printer = {
  hostname: string;
  ip: string;
  status: string;
  state_message?: string;
  print_progress?: number;
  file_path?: string;
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

type HistoryJobTotals = {
  total_jobs?: number;
  total_time?: number; // seconds
  total_print_time?: number; // seconds
  total_filament_used?: number; // mm
  longest_job?: number; // seconds
  longest_print?: number; // seconds
};

type HistoryJob = {
  filename?: string;
  status?: string;
  start_time?: number;
  end_time?: number | null;
  print_duration?: number;
  total_duration?: number;
};

type HistoryAggPrinterRow = {
  hostname?: string;
  ip?: string;
  base_url?: string;
  ok: boolean;
  error?: string | null;
  job_totals?: HistoryJobTotals | null;
  longest_job?: HistoryJob | null;
};

type HistoryAggResponse = {
  fleet?: {
    printers_seen?: number;
    printers_ok?: number;
    total_jobs?: number;
    total_time?: number;
    total_print_time?: number;
    total_filament_used?: number;
    fleet_longest_job?: { seconds: number; printer: string; job?: HistoryJob | null } | null;

    // These are provided by your Flask aggregator changes
    status_breakdown?: Record<string, number>;
    status_time_hours?: Record<string, number>;
    by_period?: Array<{ label: string; hours: number }>;
    last_print_finished?: string;
  };
  by_printer?: HistoryAggPrinterRow[];
};

const errorMsg = ref<string>('');
const { t } = useI18n();

const printers = ref<Printer[]>([]);
const profiles = ref<CalibrationProfile[]>([]);
const historyAgg = ref<HistoryAggResponse | null>(null);

const loadingPrinters = ref(true);
const loadingProfiles = ref(true);
const loadingHistory = ref(true);

const loadingAny = computed(() => loadingPrinters.value || loadingProfiles.value || loadingHistory.value);

// ---- Printer "printing now"
const normalizeStatus = (s?: string) => (s ?? '').trim().toLowerCase();

const isPrinterPrintingNow = (p: Printer) => {
  const s = normalizeStatus(p.status);
  if (s !== 'printing') return false;
  const hasProgress = typeof p.print_progress === 'number' && p.print_progress > 0;
  const hasFile = typeof p.file_path === 'string' && p.file_path.trim().length > 0;
  return hasProgress || hasFile;
};

const printingNowCount = computed(() => printers.value.filter(isPrinterPrintingNow).length);

// ---- Fleet metrics for graphs (from /api/history/aggregate response)
const fleetMetrics = computed(() => historyAgg.value?.fleet ?? null);
const fleetCounts = computed<Record<string, number>>(() => fleetMetrics.value?.status_breakdown ?? {});
const fleetTimeH = computed<Record<string, number>>(() => fleetMetrics.value?.status_time_hours ?? {});
const fleetPeriods = computed(() => fleetMetrics.value?.by_period ?? []);
const fleetMaxPeriodHours = computed(() => Math.max(0, ...fleetPeriods.value.map(p => Number(p.hours ?? 0))));

const fleetTotalTimeHours = computed(() => {
  const t = fleetTimeH.value;
  return (t.completed ?? 0) + (t.cancelled ?? 0) + (t.error ?? 0) + (t.other ?? 0);
});

const segPct = (h?: number) => {
  const total = fleetTotalTimeHours.value;
  if (!total || total <= 0) return '0%';
  const v = Math.max(0, Number(h ?? 0));
  return `${Math.min(100, (v / total) * 100)}%`;
};

const pct = (h?: number) => {
  const total = fleetTotalTimeHours.value;
  if (!total || total <= 0) return '0.0%';
  const v = Math.max(0, Number(h ?? 0));
  return `${((v / total) * 100).toFixed(1)}%`;
};

const barHeightPct = (hours?: number, maxH?: number) => {
  const h = Math.max(0, Number(hours ?? 0));
  const m = Math.max(0, Number(maxH ?? 0));
  if (!m) return '0%';
  return `${Math.max(4, (h / m) * 100)}%`;
};

// ---- Leaderboards computed
const fleetLongestJobSeconds = computed(() => historyAgg.value?.fleet?.fleet_longest_job?.seconds ?? 0);
const fleetLongestJobPrinter = computed(() => historyAgg.value?.fleet?.fleet_longest_job?.printer ?? '');
const fleetLongestJobFile = computed(() => historyAgg.value?.fleet?.fleet_longest_job?.job?.filename ?? '');

// ---- Table rows
const historyTableRows = computed(() => {
  const rows = historyAgg.value?.by_printer ?? [];
  return rows.map(r => {
    const jt = r.job_totals ?? {};
    return {
      hostname: r.hostname ?? r.ip ?? '—',
      ip: r.ip ?? '—',
      ok: !!r.ok,
      error: r.error ?? null,

      total_jobs: Number(jt.total_jobs ?? 0),
      total_time: Number(jt.total_time ?? 0),
      total_print_time: Number(jt.total_print_time ?? 0),
      total_filament_used: Number(jt.total_filament_used ?? 0),

      longest_job: Number(jt.longest_job ?? 0),
      longest_job_file: r.longest_job?.filename ?? '',
    };
  });
});

const historyHeaders = computed(() => [
  { title: t('analytics.perPrinter.colPrinter'), key: 'hostname' },
  { title: t('analytics.perPrinter.colOk'), key: 'ok' },
  { title: t('analytics.perPrinter.colTotalPrints'), key: 'total_jobs' },
  { title: t('analytics.perPrinter.colPrintTime'), key: 'total_print_time' },
  { title: t('analytics.perPrinter.colTotalTime'), key: 'total_time' },
  { title: t('analytics.perPrinter.colFilament'), key: 'total_filament_used' },
  { title: t('analytics.perPrinter.colLongestJob'), key: 'longest_job' },
  { title: t('analytics.perPrinter.colError'), key: 'error' },
]);

// ---- Top by print time
const topByPrintTimeRow = computed(() => {
  const rows = historyTableRows.value.slice().sort((a, b) => (b.total_print_time ?? 0) - (a.total_print_time ?? 0));
  return rows[0] ?? null;
});
const topByPrintTimeSeconds = computed(() => topByPrintTimeRow.value?.total_print_time ?? 0);
const topByPrintTimePrinter = computed(() => topByPrintTimeRow.value?.hostname ?? '');

// ---- Top by print count (fixed naming to avoid TS redeclare)
const topByPrintCountRow = computed(() => {
  const rows = historyTableRows.value.slice().sort((a, b) => (b.total_jobs ?? 0) - (a.total_jobs ?? 0));
  return rows[0] ?? null;
});
const topByPrintCount = computed(() => topByPrintCountRow.value?.total_jobs ?? 0);
const topByPrintCountPrinter = computed(() => topByPrintCountRow.value?.hostname ?? '');

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

const humanDuration = (seconds?: number) => {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '—';
  const totalSec = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0) parts.push(`${mins}m`);
  if (hours === 0 && mins === 0) parts.push(`${secs}s`);
  return parts.join(' ');
};

// for graph legend where we have hours already
const humanDurationHr = (hours?: number) => {
  if (hours === null || hours === undefined || Number.isNaN(Number(hours))) return '—';
  return humanDuration(Number(hours) * 3600);
};

const fmtMeters = (mm?: number) => {
  if (mm === null || mm === undefined || Number.isNaN(Number(mm))) return '—';
  const m = Number(mm) / 1000.0;
  if (!Number.isFinite(m)) return '—';
  return `${m.toFixed(1)} m`;
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
  return String(str).replace(/\\x([0-9A-Fa-f]{2})/g, (_, hh) =>
    String.fromCharCode(parseInt(hh, 16))
  );
};

const notesText = (p: CalibrationProfile) => {
  const bits: string[] = [];
  if (p.flow_notes) bits.push(`${t('analytics.calibration.flowNote')} ${unescapeHex(p.flow_notes)}`);
  if (p.pressure_advance_notes) bits.push(`${t('analytics.calibration.paNote')} ${unescapeHex(p.pressure_advance_notes)}`);
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

const fetchHistoryAggregate = async () => {
  loadingHistory.value = true;
  try {
    const res = await fetch('/api/history/aggregate', { cache: 'no-store' });
    if (!res.ok) throw new Error(`history aggregate: ${res.status}`);
    historyAgg.value = await res.json();
  } finally {
    loadingHistory.value = false;
  }
};

const fetchProfiles = async () => {
  loadingProfiles.value = true;
  try {
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
    await Promise.all([fetchPrinters(), fetchHistoryAggregate(), fetchProfiles()]);
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

/* Status bar */
.status-bar {
  display: flex;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.status-seg {
  height: 100%;
}
.status-seg.completed {
  background: linear-gradient(to right, #FFBD00, #FFD400);
}
.status-seg.error {
  background: linear-gradient(to right, #5b2f35, #7b3b44);
}
.status-seg.cancelled {
  background: linear-gradient(to right, #343447, #4a4a63);
}
.status-seg.other {
  background: linear-gradient(to right, #2c3138, #3b414b);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  display: inline-block;
}
.dot.completed {
  background: linear-gradient(to right, #FFBD00, #FFD400);
}
.dot.cancelled {
  background: linear-gradient(to right, #343447, #4a4a63);
}
.dot.error {
  background: linear-gradient(to right, #5b2f35, #7b3b44);
}
.dot.other {
  background: linear-gradient(to right, #2c3138, #3b414b);
}

.last-print {
  margin-top: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  color: rgba(255, 255, 255, 0.85);
}

.tiny {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 2px;
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

.history-table {
  background: transparent;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.10);
}

/* Pills */
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

