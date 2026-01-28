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
        <!-- Pinned Printers -->
        <div class="glass-card">
          <div class="card-title">
            <v-icon size="18" color="yellow">mdi-pin</v-icon>
            <span>Pinned</span>
          </div>

          <div class="card-sub">Pin printers for quick access.</div>

          <div class="empty-hint">
            Nothing pinned yet.
          </div>
        </div>

        <!-- Selected Printers (placeholder) -->
        <div class="glass-card">
          <div class="card-title">
            <v-icon size="18" color="yellow">mdi-checkbox-multiple-marked</v-icon>
            <span>Selected</span>
          </div>

          <div class="card-sub">Quick actions for your current selection.</div>

          <div class="quick-actions">
            <v-btn size="small" variant="tonal" color="yellow" block>
              <v-icon start>mdi-refresh</v-icon>
              Refresh Selected
            </v-btn>

            <v-btn size="small" variant="outlined" color="grey" block>
              <v-icon start>mdi-restart</v-icon>
              Firmware Restart
            </v-btn>
          </div>
        </div>

        <!-- Notes / Scratchpad -->
        <div class="glass-card">
          <div class="card-title">
            <v-icon size="18" color="yellow">mdi-note-text</v-icon>
            <span>Notes</span>
          </div>

          <v-textarea
            density="compact"
            auto-grow
            rows="2"
            max-rows="6"
            hide-details
            placeholder="Scratchpad…"
            class="notes"
          />
        </div>
      </div>
    </div>

    <!-- Edge toggle when collapsed -->
    <v-btn
      v-if="collapsed"
      class="rail-toggle yellow-accent"
      icon
      @click="$emit('toggle')"
      title="Open utilities"
    >
      <v-icon>mdi-chevron-left</v-icon>
    </v-btn>
  </aside>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    collapsed: boolean
    width: number
    collapsedWidth?: number
  }>(),
  {
    collapsedWidth: 38, // enough room for the 30px button + padding
  }
)

defineEmits<{
  (e: 'toggle'): void
}>()
</script>

<style scoped>
.right-rail{
  position: relative;
  height: 100%;
  overflow: hidden;
  transition: width 160ms ease;
  flex: 0 0 auto;

  /* background “shell” */
  background:
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.14)),
    radial-gradient(circle at 65% 18%, rgba(255,213,74,0.08), transparent 52%),
    radial-gradient(circle at 20% 75%, rgba(255,255,255,0.04), transparent 60%),
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
  /* subtle yellow edge glow on LEFT edge of right rail */
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
}

.rail-drawer{
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  background-color: #242527;
  border-left: 1px solid rgba(255,255,255,0.08);
}

/* Header */
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

@keyframes headerSheen{
  0%   { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
  35%  { transform: translateX(0%)   rotate(8deg); opacity: 0.60; }
  70%  { transform: translateX(18%)  rotate(8deg); opacity: 0.35; }
  100% { transform: translateX(-18%) rotate(8deg); opacity: 0.25; }
}

.rail-header-content{
  width: 100%;
  display:flex;
  align-items:center;
  justify-content: space-between;
  padding: 0 8px 0 10px;
}

.rail-title{
  font-weight: 600;
  font-size: 13px;
  line-height: 30px;
  opacity: 0.95;
}

.rail-close{
  opacity: 0.85;
}
.rail-close:hover{
  opacity: 1;
}

/* Body */
.rail-body{
  flex: 1 1 auto;
  overflow: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Glass cards inside */
.glass-card{
  position: relative;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 18px 40px rgba(0,0,0,0.22);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
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
  border-radius: 10px;
  background: rgba(0,0,0,0.18);
  border: 1px dashed rgba(255,255,255,0.10);
}

.quick-actions{
  margin-top: 10px;
  display:flex;
  flex-direction: column;
  gap: 8px;
}

.notes :deep(textarea){
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
  font-size: 12px;
  line-height: 1.35;
}

/* Collapsed toggle button (shows inside the slim collapsed rail) */
.rail-toggle{
  position: absolute;
  top: 0;
  right: 4px; /* keep it visible in collapsedWidth */
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
