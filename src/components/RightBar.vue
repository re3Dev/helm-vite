<template>
  <aside
    class="right-rail"
    :class="{ collapsed }"
    :style="{ width: collapsed ? collapsedWidth + 'px' : width + 'px' }"
  >
    <!-- Drawer -->
    <div v-show="!collapsed" class="rail-drawer">
      <div class="rail-header fancy">
        <div class="rail-header-content">
          <div class="rail-title">Utilities</div>

          <v-btn
            icon
            variant="text"
            size="small"
            class="rail-close"
            @click="$emit('toggle')"
            title="Collapse utilities"
          >
            <v-icon>mdi-chevron-right</v-icon>
          </v-btn>
        </div>
      </div>

      <div class="rail-body">
        <!-- Notes -->
        <div class="glass-card">
          <div class="card-title">
            <v-icon size="18" color="yellow">mdi-note-text</v-icon>
            <span>Notes</span>

            <v-spacer />

            <v-btn
              icon
              size="x-small"
              variant="text"
              class="mini-icon"
              :title="apiOk ? 'Saved' : 'Offline (local only)'"
            >
              <v-icon :color="apiOk ? 'green' : 'grey'">
                {{ apiOk ? 'mdi-cloud-check-outline' : 'mdi-cloud-off-outline' }}
              </v-icon>
            </v-btn>
          </div>

          <div class="card-sub">Quick notes that persist.</div>

          <div class="note-entry">
            <v-text-field
              v-model="newNote"
              density="compact"
              hide-details
              placeholder="Add a note…"
              class="sidebar-input"
              @keyup.enter="addNote()"
            />
            <v-btn
              icon
              size="small"
              variant="tonal"
              color="yellow"
              class="add-btn"
              @click="addNote()"
              :disabled="!newNote.trim()"
              title="Add note"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <div v-if="notes.length === 0" class="empty-hint">No notes yet.</div>

          <div v-else class="note-list">
            <div v-for="n in notes" :key="n.id" class="note-item">
              <div class="note-text">{{ n.text }}</div>
              <div class="note-meta">
                <span class="note-date">{{ fmtTime(n.created_at) }}</span>

                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  class="mini-icon"
                  @click="deleteNote(n.id)"
                  title="Delete note"
                >
                  <v-icon>mdi-delete-outline</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </div>

        <!-- Tasks -->
        <div class="glass-card">
          <div class="card-title">
            <v-icon size="18" color="yellow">mdi-format-list-checks</v-icon>
            <span>Tasks</span>

            <v-spacer />

            <div class="task-count" :title="`${openTasks} open / ${tasks.length} total`">
              {{ openTasks }} open
            </div>
          </div>

          <div class="card-sub">Small checklist that persists.</div>

          <div class="task-entry">
            <v-text-field
              v-model="newTask"
              density="compact"
              hide-details
              placeholder="Add a task…"
              class="sidebar-input"
              @keyup.enter="addTask()"
            />
            <v-btn
              icon
              size="small"
              variant="tonal"
              color="yellow"
              class="add-btn"
              @click="addTask()"
              :disabled="!newTask.trim()"
              title="Add task"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </div>

          <div v-if="tasks.length === 0" class="empty-hint">No tasks yet.</div>

          <div v-else class="task-list">
            <div
              v-for="t in sortedTasks"
              :key="t.id"
              class="task-item"
              :class="{ done: t.done }"
            >
              <v-checkbox-btn
                :model-value="t.done"
                @update:model-value="(v:boolean) => setTaskDone(t.id, v)"
                density="compact"
                class="task-check"
              />
              <div class="task-main">
                <div class="task-text">{{ t.text }}</div>
                <div class="task-meta">
                  <span>{{ fmtTime(t.created_at) }}</span>
                </div>
              </div>

              <v-btn
                icon
                size="x-small"
                variant="text"
                class="mini-icon"
                @click="deleteTask(t.id)"
                title="Delete task"
              >
                <v-icon>mdi-delete-outline</v-icon>
              </v-btn>
            </div>

            <div class="task-actions" v-if="tasks.some(t => t.done)">
              <v-btn
                size="small"
                variant="outlined"
                color="grey"
                block
                @click="clearCompleted()"
              >
                <v-icon start>mdi-broom</v-icon>
                Clear completed
              </v-btn>
            </div>
          </div>
        </div>

        <!-- Optional scratchpad (single large field) -->
        <div class="glass-card">
          <div class="card-title">
            <v-icon size="18" color="yellow">mdi-text-long</v-icon>
            <span>Scratchpad</span>
          </div>

          <v-textarea
            v-model="scratchpad"
            density="compact"
            auto-grow
            rows="2"
            max-rows="8"
            hide-details
            placeholder="Anything… (autosaves)"
            class="notes sidebar-input"
          />
        </div>
      </div>
    </div>

    <!-- Edge toggle when collapsed -->
    <v-btn
      v-if="collapsed"
      class="rail-toggle square yellow-accent"
      icon
      @click="$emit('toggle')"
      title="Open utilities"
    >
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

withDefaults(
  defineProps<{
    collapsed: boolean
    width: number
    collapsedWidth?: number
  }>(),
  {
    collapsedWidth: 38,
  }
)

defineEmits<{
  (e: 'toggle'): void
}>()

type NoteItem = { id: string; text: string; created_at: number }
type TaskItem = { id: string; text: string; done: boolean; created_at: number }
type RailState = { notes: NoteItem[]; tasks: TaskItem[]; scratchpad: string }

const STORAGE_KEY = 'helm:rightRailState:v1'
const API_URL = '/api/right-rail' // see Flask section below

const apiOk = ref(true)

const notes = ref<NoteItem[]>([])
const tasks = ref<TaskItem[]>([])
const scratchpad = ref('')

const newNote = ref('')
const newTask = ref('')

const openTasks = computed(() => tasks.value.filter(t => !t.done).length)

const sortedTasks = computed(() => {
  // open tasks first, then completed; newest first within each group
  const copy = [...tasks.value]
  copy.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return b.created_at - a.created_at
  })
  return copy
})

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function fmtTime(ts: number) {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}

function addNote() {
  const text = newNote.value.trim()
  if (!text) return
  notes.value.unshift({ id: uid('note'), text, created_at: Date.now() })
  newNote.value = ''
}

function deleteNote(id: string) {
  notes.value = notes.value.filter(n => n.id !== id)
}

function addTask() {
  const text = newTask.value.trim()
  if (!text) return
  tasks.value.unshift({ id: uid('task'), text, done: false, created_at: Date.now() })
  newTask.value = ''
}

function setTaskDone(id: string, done: boolean) {
  const t = tasks.value.find(x => x.id === id)
  if (t) t.done = done
}

function deleteTask(id: string) {
  tasks.value = tasks.value.filter(t => t.id !== id)
}

function clearCompleted() {
  tasks.value = tasks.value.filter(t => !t.done)
}

/** ---- Persistence (API first, localStorage fallback) ---- */
function getState(): RailState {
  return { notes: notes.value, tasks: tasks.value, scratchpad: scratchpad.value }
}

function applyState(s: RailState) {
  notes.value = Array.isArray(s.notes) ? s.notes : []
  tasks.value = Array.isArray(s.tasks) ? s.tasks : []
  scratchpad.value = typeof s.scratchpad === 'string' ? s.scratchpad : ''
}

function saveLocal(s: RailState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {}
}

function loadLocal(): RailState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function loadRemote(): Promise<RailState | null> {
  try {
    const r = await fetch(API_URL, { method: 'GET' })
    if (!r.ok) throw new Error(`GET ${r.status}`)
    const data = (await r.json()) as RailState
    apiOk.value = true
    return data
  } catch {
    apiOk.value = false
    return null
  }
}

async function saveRemote(s: RailState): Promise<boolean> {
  try {
    const r = await fetch(API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    })
    if (!r.ok) throw new Error(`PUT ${r.status}`)
    apiOk.value = true
    return true
  } catch {
    apiOk.value = false
    return false
  }
}

// simple debounce (no deps)
let saveTimer: number | null = null
function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(async () => {
    const s = getState()
    // always keep local as a backup
    saveLocal(s)
    // then try server
    await saveRemote(s)
  }, 400)
}

onMounted(async () => {
  // 1) prefer server state
  const remote = await loadRemote()
  if (remote) {
    applyState(remote)
    saveLocal(remote)
    return
  }

  // 2) fallback local
  const local = loadLocal()
  if (local) applyState(local)
})

watch(notes, scheduleSave, { deep: true })
watch(tasks, scheduleSave, { deep: true })
watch(scratchpad, scheduleSave)
</script>

<style scoped>
/* -------------------------------------------------------------------------- */
/*  RIGHT RAIL: make it match the LEFT sidebar aesthetic                       */
/* -------------------------------------------------------------------------- */

.right-rail{
  position: relative;
  height: 100%;
  overflow: hidden;
  transition: width 160ms ease;
  flex: 0 0 auto;

  background:
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.14)),
    radial-gradient(circle at 30% 20%, rgba(255,213,74,0.08), transparent 55%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04), transparent 60%),
    #1f2022;

  box-shadow:
    0 1px 0 rgba(255,255,255,0.05) inset,
    0 -1px 0 rgba(0,0,0,0.35) inset;
}

.right-rail::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity: 0.16;
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255,255,255,0.05) 0px,
      rgba(255,255,255,0.05) 1px,
      transparent 1px,
      transparent 7px
    );
}

.right-rail::after{
  content:"";
  position:absolute;
  top:0;
  left:0;
  width: 3px;
  height: 100%;
  pointer-events:none;
  background: linear-gradient(
    180deg,
    rgba(255,213,74,0.0),
    rgba(255,213,74,0.20),
    rgba(255,213,74,0.0)
  );
  opacity: 0.70;
  filter: blur(0.4px);
  animation: containerEdgeGlow 5.2s ease-in-out infinite;
}

@keyframes containerEdgeGlow{
  0%, 100% { opacity: 0.45; }
  50%      { opacity: 0.85; }
}

@media (prefers-reduced-motion: reduce){
  .right-rail::after{ animation: none !important; }
}

.rail-drawer{
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;

  background-color: rgba(36,37,39,0.92);
  border-left: 1px solid rgba(255,255,255,0.08);
}

.rail-header{
  height: 30px;
  background-color: #333131;
  border-bottom: 1px solid rgba(255,255,255,0.10);
  display:flex;
  align-items:center;
  justify-content:center;
  flex: 0 0 auto;
}

.rail-header.fancy{
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.04), rgba(0,0,0,0.10)),
    #333131;
}

.rail-header.fancy::before{
  content:"";
  position:absolute;
  top:-40%;
  left:-60%;
  width: 160%;
  height: 200%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,213,74,0.10) 45%,
    rgba(255,213,74,0.22) 50%,
    rgba(255,213,74,0.10) 55%,
    transparent 100%
  );
  transform: rotate(8deg);
  animation: headerSheen 7.5s ease-in-out infinite;
  pointer-events: none;
  mix-blend-mode: screen;
  opacity: 0.55;
}

.rail-header.fancy::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255,255,255,0.06), transparent 45%),
    radial-gradient(circle at 80% 70%, rgba(255,255,255,0.04), transparent 55%);
  pointer-events:none;
  opacity: 0.6;
}

@keyframes headerSheen{
  0%   { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
  35%  { transform: translateX(0%)   rotate(8deg); opacity: 0.60; }
  70%  { transform: translateX(18%)  rotate(8deg); opacity: 0.35; }
  100% { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
}

@media (prefers-reduced-motion: reduce){
  .rail-header.fancy::before{ animation: none !important; }
}

.rail-header-content{
  width: 100%;
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 0 8px 0 10px;
}

.rail-title{
  font-weight: 650;
  font-size: 13.5px;
  line-height: 30px;
  letter-spacing: 0.25px;
  opacity: 0.95;
  position: relative;
}

.rail-title::after{
  content:"";
  position:absolute;
  left: 0;
  bottom: -6px;
  width: 54px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255,213,74,0.90), transparent);
  opacity: 0.50;
}

.rail-close{ opacity: 0.85; }
.rail-close:hover{ opacity: 1; }

.rail-body{
  flex: 1 1 auto;
  overflow: auto;
  padding: 10px;
  position: relative;

  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rail-body::before{
  content:"";
  position:absolute;
  inset: 10px;
  border-radius: 14px;
  pointer-events:none;

  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.10);

  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 18px 46px rgba(0,0,0,0.30);

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.rail-body::after{
  content:"";
  position:absolute;
  inset: 10px;
  border-radius: 14px;
  pointer-events:none;

  background:
    radial-gradient(circle at 18% 18%, rgba(255,255,255,0.10), transparent 50%),
    radial-gradient(circle at 82% 70%, rgba(255,213,74,0.07), transparent 58%),
    linear-gradient(180deg, rgba(0,0,0,0.00), rgba(0,0,0,0.10));
  opacity: 0.92;
}

.glass-card{
  position: relative;
  z-index: 2;

  padding: 10px;
  border-radius: 14px;
  overflow: hidden;

  background: rgba(0,0,0,0.16);
  border: 1px solid rgba(255,255,255,0.10);

  box-shadow:
    0 1px 0 rgba(255,255,255,0.04) inset,
    0 10px 22px rgba(0,0,0,0.25);

  transition: transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.glass-card:hover{
  background: rgba(0,0,0,0.20);
  border-color: rgba(255,255,255,0.14);
  transform: translateY(-1px);
}

.card-title{
  display:flex;
  align-items:center;
  gap: 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.92;
}

.card-sub{
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.75;
}

.empty-hint{
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.65;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0,0,0,0.14);
  border: 1px dashed rgba(255,255,255,0.10);
}

.sidebar-input :deep(.v-field){
  background: rgba(0,0,0,0.18) !important;
  border: 1px solid rgba(255,255,255,0.10) !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
}
.sidebar-input :deep(.v-field__outline){ opacity: 0 !important; }
.sidebar-input :deep(.v-label){ opacity: 0.80; }
.sidebar-input :deep(.v-field__input),
.sidebar-input :deep(input),
.sidebar-input :deep(textarea){ font-size: 12.5px; }

.notes :deep(textarea){
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  font-size: 12px;
  line-height: 1.35;
}

/* Notes UI */
.note-entry,
.task-entry{
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
}

.add-btn{
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 10px;
}

.note-list{
  margin-top: 10px;
  display:flex;
  flex-direction: column;
  gap: 8px;
}

.note-item{
  padding: 10px;
  border-radius: 12px;
  background: rgba(0,0,0,0.14);
  border: 1px solid rgba(255,255,255,0.10);
}

.note-text{
  font-size: 12.5px;
  line-height: 1.35;
  white-space: pre-wrap;
  word-break: break-word;
}

.note-meta{
  margin-top: 6px;
  display:flex;
  align-items:center;
  justify-content: space-between;
  opacity: 0.70;
  font-size: 11px;
}

/* Tasks UI */
.task-count{
  font-size: 11px;
  opacity: 0.70;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(0,0,0,0.18);
  border: 1px solid rgba(255,255,255,0.10);
}

.task-list{
  margin-top: 10px;
  display:flex;
  flex-direction: column;
  gap: 8px;
}

.task-item{
  display:flex;
  align-items:flex-start;
  gap: 8px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(0,0,0,0.14);
  border: 1px solid rgba(255,255,255,0.10);
}

.task-item.done{
  opacity: 0.72;
}

.task-item.done .task-text{
  text-decoration: line-through;
}

.task-check{
  margin-top: -2px;
}

.task-main{
  flex: 1 1 auto;
  min-width: 0;
}

.task-text{
  font-size: 12.5px;
  line-height: 1.35;
  word-break: break-word;
}

.task-meta{
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.70;
}

.task-actions{
  margin-top: 10px;
}

/* tiny icon buttons */
.mini-icon{ opacity: 0.82; }
.mini-icon:hover{ opacity: 1; }

/* Collapsed toggle button */
.rail-toggle{
  position: absolute;
  top: 0;
  left: 4px;
  z-index: 50;
  width: 30px;
  height: 30px;
  min-width: 30px;
  border-radius: 6px;
  background: #333131;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 10px 22px rgba(0,0,0,0.35);
  overflow: hidden;
}

.rail-toggle.yellow-accent::after{
  content:"";
  position:absolute;
  top:0;
  left:0;
  width: 3px;
  height: 100%;
  background: #FFD54A;
  opacity: 0.9;
}
</style>
