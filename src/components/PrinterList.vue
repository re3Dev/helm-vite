<template>
  <v-container fluid class="printer-list-root" :class="{ 'cards-only-root': cardsOnlyMode }">
    <!-- Top bar: centered view toggle + utilities on right -->
    <div v-show="!cardsOnlyMode" class="top-bar">
      <div class="top-bar-left"></div>

      <div class="top-bar-center">
        <v-btn-toggle v-model="viewType" mandatory class="view-toggle">
          <v-btn value="grid">
            <v-icon>mdi-grid</v-icon>
          </v-btn>
          <v-btn value="list">
            <v-icon>mdi-format-list-bulleted</v-icon>
          </v-btn>
        </v-btn-toggle>
      </div>

      <div class="top-bar-right">
        <button
          v-if="viewType === 'grid'"
          ref="cardsOnlyTrigger"
          type="button"
          class="cards-only-trigger"
          :title="$t('cardView.enter')"
          :aria-label="$t('cardView.enter')"
          @click="cardsOnlyMode = true"
        >
          <v-icon size="20">mdi-arrow-expand</v-icon>
        </button>
        <v-btn
          variant="outlined"
          color="red"
          size="small"
          class="estop-btn"
          :disabled="selectedPrinters.length === 0"
          @click="emergencyStopSelected"
          :title="$t('controls.emergencyStop')"
        >
          <v-icon start>mdi-alert-octagon</v-icon>
          {{ $t('controls.emergencyStop') }}
        </v-btn>

        <!-- Utilities dropdown -->
        <v-menu location="bottom end" offset="8">
          <template #activator="{ props }">
            <v-btn v-bind="props" icon variant="text" class="utility-btn" :title="$t('utilities.title')">
              <v-icon color="primary">mdi-cog</v-icon>
            </v-btn>
          </template>

          <v-list density="compact" class="utility-menu">
            <v-list-item :disabled="selectedPrinters.length === 0" @click="restartFirmware">
              <template #prepend>
                <v-icon color="red">mdi-restart</v-icon>
              </template>
              <v-list-item-title>{{ $t('controls.firmwareRestart') }}</v-list-item-title>
              <v-list-item-subtitle v-if="selectedPrinters.length === 0">
                {{ $t('controls.selectAtLeastOne') }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-list-item @click="showSortSettings = true">
              <template #prepend>
                <v-icon color="primary">mdi-sort</v-icon>
              </template>
              <v-list-item-title>{{ $t('sort.menuItem') }}</v-list-item-title>
            </v-list-item>

            <v-list-item @click="openNetworkSettings">
              <template #prepend>
                <v-icon color="cyan">mdi-wifi-cog</v-icon>
              </template>
              <v-list-item-title>{{ $t('network.menuItem') }}</v-list-item-title>
            </v-list-item>

            <v-list-item @click="showLanguageSettings = true">
              <template #prepend>
                <v-icon color="green">mdi-translate</v-icon>
              </template>
              <v-list-item-title>{{ $t('language.menuItem') }}</v-list-item-title>
            </v-list-item>

            <v-list-item @click="showLayoutSettings = true">
              <template #prepend>
                <v-icon color="primary">mdi-card-multiple-outline</v-icon>
              </template>
              <v-list-item-title>{{ $t('cardLayout.menuItem') }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>

    <v-alert v-if="layoutStorageError" type="error" variant="tonal" closable @click:close="layoutStorageError = ''">{{ layoutStorageError }}</v-alert>

    <v-dialog v-model="showNetworkSettings" max-width="480">
      <v-card color="background">
        <v-card-title class="d-flex align-center">
          <v-icon color="cyan" class="mr-2">mdi-wifi-cog</v-icon>
          {{ $t('network.title') }}
        </v-card-title>

        <v-card-text>
          <div class="text-body-2 mb-4" style="opacity: 0.7;">{{ $t('network.description') }}</div>
          <v-text-field
            v-model="networkCidr"
            :label="$t('network.cidrLabel')"
            :placeholder="$t('network.cidrPlaceholder')"
            :hint="$t('network.cidrHint')"
            persistent-hint
            density="compact"
            variant="outlined"
            prepend-inner-icon="mdi-ip-network"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showNetworkSettings = false">{{ $t('common.cancel') }}</v-btn>
          <v-btn variant="tonal" color="cyan" @click="saveNetworkSettings">{{ $t('network.saveAndScan') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLanguageSettings" max-width="360">
      <v-card color="background">
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-translate</v-icon>
          {{ $t('language.title') }}
        </v-card-title>

        <v-card-text>
          <v-radio-group v-model="currentLocale" density="compact">
            <v-radio
              v-for="loc in SUPPORTED_LOCALES"
              :key="loc.code"
              :value="loc.code"
              :label="loc.label"
            />
          </v-radio-group>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" color="green" @click="showLanguageSettings = false">{{ $t('common.done') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showLayoutSettings" max-width="680">
      <v-card color="background">
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-card-multiple-outline</v-icon>
          {{ $t('cardLayout.title') }}
        </v-card-title>

        <v-card-text>
          <div class="text-body-2 mb-4" style="opacity: 0.7;">{{ $t('cardLayout.description') }}</div>

          <div class="layout-options">
            <button
              v-for="opt in layoutOptions"
              :key="opt.value"
              type="button"
              class="layout-option"
              :class="{ 'layout-option-active': cardLayout === opt.value }"
              :aria-pressed="cardLayout === opt.value"
              @click="setCardLayout(opt.value)"
            >
              <v-icon size="32" class="mb-2">
                {{ opt.icon }}
              </v-icon>
              <span class="text-subtitle-2">{{ $t(`cardLayout.options.${opt.value}`) }}</span>
              <span class="text-caption" style="opacity: 0.6;">{{ $t(`cardLayout.hints.${opt.value}`) }}</span>
            </button>
          </div>
          <div class="custom-layout-heading">
            <h2>{{ $t('cardBuilder.savedLayouts') }}</h2>
            <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="openCardBuilder()">{{ $t('cardBuilder.create') }}</v-btn>
          </div>
          <p v-if="!customCardLayouts.length" class="text-caption text-medium-emphasis">{{ $t('cardBuilder.noLayouts') }}</p>
          <div v-for="layout in customCardLayouts" :key="layout.id" class="custom-layout-row">
            <button type="button" class="custom-layout-choice" :class="{ 'layout-option-active': cardLayout === `custom:${layout.id}` }" :aria-pressed="cardLayout === `custom:${layout.id}`" @click="setCardLayout(`custom:${layout.id}`)">
              <v-icon size="20">mdi-card-edit-outline</v-icon>
              <span>{{ layout.name }}</span>
            </button>
            <v-btn icon variant="text" :aria-label="$t('cardBuilder.editLayout', { name: layout.name })" @click="openCardBuilder(layout)"><v-icon>mdi-pencil</v-icon></v-btn>
            <v-btn icon variant="text" :aria-label="$t('cardBuilder.copyLayout', { name: layout.name })" @click="openCardBuilder(layout, true)"><v-icon>mdi-content-copy</v-icon></v-btn>
            <v-btn icon variant="text" color="error" :aria-label="$t('cardBuilder.deleteLayout', { name: layout.name })" @click="pendingLayoutDelete = layout"><v-icon>mdi-delete-outline</v-icon></v-btn>
          </div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="tonal" color="primary" @click="showLayoutSettings = false">{{ $t('common.done') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <CardLayoutBuilder
      v-if="showCardBuilder"
      :layout="builderLayout"
      :layouts="customCardLayouts"
      :storage-error="layoutStorageError"
      @save="saveCustomCardLayout"
      @cancel="showCardBuilder = false; showLayoutSettings = true"
    />

    <v-dialog :model-value="!!pendingLayoutDelete" max-width="420" @update:model-value="pendingLayoutDelete = null">
      <v-card color="background">
        <v-card-title>{{ $t('cardBuilder.deleteTitle') }}</v-card-title>
        <v-card-text>{{ $t('cardBuilder.deleteConfirm', { name: pendingLayoutDelete?.name }) }}</v-card-text>
        <v-alert v-if="layoutStorageError" type="error" variant="tonal" class="mx-4">{{ layoutStorageError }}</v-alert>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="pendingLayoutDelete = null">{{ $t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="tonal" @click="deleteCustomCardLayout">{{ $t('cardBuilder.delete') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showSortSettings" max-width="560">
      <v-card color="background">
        <v-card-title class="d-flex align-center">
          <v-icon color="primary" class="mr-2">mdi-sort</v-icon>
          {{ $t('sort.title') }}
        </v-card-title>

        <v-card-text>
          <v-radio-group v-model="sortMode" density="compact">
            <v-radio value="dynamic" :label="$t('sort.dynamic')"></v-radio>
            <v-radio value="dynamic-printing-first" :label="$t('sort.dynamicPrintingFirst')"></v-radio>
            <v-radio value="alphabetical" :label="$t('sort.alphabetical')"></v-radio>
            <v-radio value="custom" :label="$t('sort.custom')"></v-radio>
          </v-radio-group>

          <div v-if="sortMode === 'custom'" class="custom-order-box">
            <div class="text-caption mb-2">{{ $t('sort.moveToSetOrder') }}</div>
            <v-list density="compact" class="custom-order-list">
              <v-list-item
                v-for="(printer, idx) in customOrderPrinters"
                :key="printer.ip"
                class="custom-order-item"
              >
                <template #prepend>
                  <span class="order-index">{{ idx + 1 }}</span>
                </template>

                <v-list-item-title class="printer-name">{{ printer.hostname }}</v-list-item-title>
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
          <v-btn variant="tonal" color="primary" @click="showSortSettings = false">{{ $t('common.done') }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- GRID VIEW -->
    <v-card v-if="viewType === 'grid'" class="pa-4" color="background" width="100%">
      <v-sheet class="grid-container" :class="activeCustomLayout ? 'layout-custom' : `layout-${cardLayout}`" color="background">
        <template v-if="isLoading">
          <!-- Compact skeletons -->
          <template v-if="cardLayout === 'compact'">
            <v-card v-for="n in 18" :key="n" color="surface" class="pa-2 floating-card compact-card">
              <v-skeleton-loader type="text, text" :loading="true" />
            </v-card>
          </template>
          <!-- Detailed skeletons -->
          <template v-else-if="cardLayout === 'detailed'">
            <v-card v-for="n in 8" :key="n" color="surface" class="pa-3 floating-card detailed-card">
              <!-- Header: hostname + subtitle row -->
              <div class="skel-bone" style="height: 20px; width: 45%; border-radius: 4px;"></div>
              <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                <div class="skel-bone" style="height: 12px; width: 12px; border-radius: 50%;"></div>
                <div class="skel-bone" style="height: 12px; width: 30%; border-radius: 4px;"></div>
                <div class="skel-bone" style="height: 10px; width: 20%; border-radius: 4px; opacity: 0.5;"></div>
              </div>
              <v-divider class="my-2"></v-divider>
              <!-- Two-column body -->
              <div class="detailed-body">
                <div class="detailed-left">
                  <!-- Status line -->
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <div class="skel-bone" style="height: 14px; width: 14px; border-radius: 50%;"></div>
                    <div class="skel-bone" style="height: 14px; width: 55%; border-radius: 4px;"></div>
                  </div>
                  <!-- Progress bar -->
                  <div class="skel-bone" style="height: 20px; width: 100%; border-radius: 4px; margin-top: 8px;"></div>
                  <!-- File name -->
                  <div class="skel-bone" style="height: 13px; width: 75%; border-radius: 4px; margin-top: 4px;"></div>
                </div>
                <div class="detailed-right">
                  <div class="detailed-temp-grid">
                    <div v-for="t in 3" :key="t" class="detailed-temp-item">
                      <div class="skel-bone" style="height: 20px; width: 20px; border-radius: 50%;"></div>
                      <div class="skel-bone" style="height: 14px; width: 50px; border-radius: 4px;"></div>
                      <div class="skel-bone" style="height: 16px; width: 42px; border-radius: 4px; margin-left: auto;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </v-card>
          </template>
          <template v-else-if="isFleetLayout">
            <v-card v-for="n in 6" :key="n" color="surface" class="fleet-card">
              <v-skeleton-loader :type="cardLayout === 'preview' ? 'heading, image, text, paragraph' : cardLayout === 'rows' ? 'list-item-two-line' : 'heading, paragraph, text'" />
            </v-card>
          </template>
          <!-- Default skeletons -->
          <template v-else>
            <v-card v-for="n in 12" :key="n" color="surface" class="pa-3 floating-card">
              <v-skeleton-loader type="heading, divider, list-item-two-line, ossein, chip, list-item-three-line" :loading="true" />
            </v-card>
          </template>
        </template>

        <template v-else>

          <!-- ==================== COMPACT LAYOUT ==================== -->
          <template v-if="cardLayout === 'compact'">
            <v-card
              v-for="printer in sortedPrinters"
              :key="printer.ip"
              color="surface"
              class="pa-2 floating-card compact-card"
              :class="{
                'selected-card': selectedPrinters.includes(printer.ip),
                'locked-card': isPrinterLocked(printer),
                'unlocked-printing-card': isPrinterPrinting(printer) && !isPrinterLocked(printer)
              }"
              @click="toggleSelection(printer)"
              @dblclick.stop="selectLockedPrinter(printer)"
            >
              <div class="compact-top-row">
                <span class="compact-status-dot"
                  :class="{
                    'dot-printing': isPrinterPrinting(printer) && printer.state_message === 'Printer is ready',
                    'dot-ready': isReady(printer) && !isPrinterPrinting(printer),
                    'dot-idle': isIdle(printer),
                    'dot-error': printer.state_message !== 'Printer is ready',
                    'dot-busy': isPrinterBusy(printer)
                  }"
                ></span>
                <a :href="printer.ui_url" target="_blank" class="compact-hostname printer-name">{{ printer.hostname }}</a>
                <span class="version-badge" :class="printer.helm_version ? 'version-badge-versioned' : 'version-badge-legacy'">
                  {{ printer.helm_version ? `v${printer.helm_version}` : $t('printerList.version.legacy') }}
                </span>
                <v-btn
                  v-if="isPrinterPrinting(printer)"
                  icon
                  size="x-small"
                  variant="text"
                  class="compact-lock-btn"
                  @click.stop="togglePrinterLock(printer)"
                >
                  <v-icon size="14" :color="isPrinterLocked(printer) ? 'yellow' : 'green'">
                    {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                  </v-icon>
                </v-btn>
              </div>

              <v-progress-linear
                v-if="isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'"
                :model-value="printer.print_progress * 100"
                color="#FFBD00"
                :height="6"
                class="mt-1"
                rounded
                bg-color="#BCBEC0"
                bg-opacity="0.4"
              />

              <div class="compact-temps">
                <span class="compact-temp" :class="{ 'text-yellow': printer.extruder_temperature >= 60, 'text-blue': printer.extruder_temperature < 60 }">
                  <v-icon size="12">{{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-printer-3d-nozzle-outline' }}</v-icon>{{ Math.round(printer.extruder_temperature) }}°
                </span>
                <span class="compact-temp" :class="{ 'text-yellow': printer.extruder1_temperature >= 60, 'text-blue': printer.extruder1_temperature < 60 }">
                  <v-icon size="12">{{ printer.extruder2_temperature ? 'mdi-screw-machine-flat-top' : 'mdi-printer-3d-nozzle-outline' }}</v-icon>{{ Math.round(printer.extruder1_temperature) }}°
                </span>
                <span v-if="printer.extruder2_temperature !== null && printer.extruder2_temperature !== undefined" class="compact-temp" :class="{ 'text-yellow': printer.extruder2_temperature >= 60, 'text-blue': printer.extruder2_temperature < 60 }">
                  <v-icon size="12">mdi-printer-3d-nozzle-outline</v-icon>{{ Math.round(printer.extruder2_temperature) }}°
                </span>
                <span class="compact-temp" :class="{ 'text-yellow': printer.heater_bed_temperature >= 40, 'text-blue': printer.heater_bed_temperature < 40 }">
                  <v-icon size="12">mdi-radiator</v-icon>{{ Math.round(printer.heater_bed_temperature) }}°
                </span>
              </div>
            </v-card>
          </template>

          <!-- ==================== DETAILED LAYOUT ==================== -->
          <template v-else-if="cardLayout === 'detailed'">
            <v-card
              v-for="printer in sortedPrinters"
              :key="printer.ip"
              color="surface"
              class="pa-3 floating-card detailed-card"
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
                  icon size="x-small" variant="tonal" color="grey" class="lock-btn"
                  @click.stop="togglePrinterLock(printer)"
                  :title="isPrinterLocked(printer) ? $t('printerList.lock.unlock') : $t('printerList.lock.lock')"
                >
                  <v-icon :color="isPrinterLocked(printer) ? 'yellow' : 'green'">
                    {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                  </v-icon>
                </v-btn>
              </div>

              <!-- Header: hostname + model in one row -->
              <div class="detailed-header">
                <div>
                  <v-card-title class="text-h6 pa-0">
                    <a :href="printer.ui_url" target="_blank" class="printer-name">{{ printer.hostname }}</a>
                  </v-card-title>
                  <div class="detailed-model-row">
                    <v-icon size="16" :color="printer.extruder2_temperature ? 'cyan' : 'cyan'">
                      {{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-movie-roll' }}
                    </v-icon>
                    <span class="ml-1">{{ printer.modelType || $t('printerList.unknownModel') }}</span>
                    <span class="detailed-ip">
                      <v-icon size="12" color="green" class="ml-2">mdi-wifi</v-icon>{{ printer.ip }}
                    </span>
                    <span class="version-badge ml-3" :class="printer.helm_version ? 'version-badge-versioned' : 'version-badge-legacy'">
                      {{ printer.helm_version ? `v${printer.helm_version}` : $t('printerList.version.legacy') }}
                    </span>
                  </div>
                </div>
              </div>

              <v-divider class="my-2"></v-divider>

              <!-- Two-column body -->
              <div class="detailed-body">
                <!-- Left: status + progress + file -->
                <div class="detailed-left">
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
                        <span class="text-red">{{ $t('printerList.status.error') }}</span>
                      </template>
                      <template v-else-if="isPrinterBusy(printer)">
                        <v-icon class="text-orange">mdi-timer-sand</v-icon>
                        <span class="text-orange">{{ $t('printerList.status.busy') }}</span>
                      </template>
                      <template v-else-if="isPrinterPrinting(printer)">
                        <v-icon>mdi-printer-3d-nozzle</v-icon>
                        {{ $t('printerList.status.printing') }}
                      </template>
                      <template v-else-if="isReady(printer)">
                        <v-icon>mdi-home</v-icon>
                        {{ $t('printerList.status.homed') }}
                      </template>
                      <template v-else-if="isIdle(printer)">
                        <v-icon>mdi-engine-off</v-icon>
                        {{ $t('printerList.status.disengaged') }}
                      </template>
                      <template v-else>{{ $t('printerList.status.unknown') }}</template>
                    </span>
                  </div>

                  <div class="status-sub">
                    <span v-if="getTransientStatus(printer)" :class="transientStatusClass(printer)">
                      <v-icon>mdi-progress-clock</v-icon>
                      {{ getTransientStatus(printer) }}
                    </span>
                    <span v-else-if="printer.state_message !== 'Printer is ready' && selectedPrinters.includes(printer.ip)" class="text-red">
                      <v-icon>mdi-alert-circle</v-icon>
                      {{ formatPrinterError(printer.state_message) }}
                    </span>
                  </div>

                  <div class="progress-slot mt-2">
                    <v-progress-linear
                      v-if="isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'"
                      :model-value="printer.print_progress * 100"
                      color="#FFBD00"
                      :height="20"
                      :striped="true"
                      bg-color="#BCBEC0"
                      bg-opacity="0.8"
                    >
                      <strong style="color: black;">{{ (printer.print_progress * 100).toFixed(0) }}%</strong>
                    </v-progress-linear>
                  </div>

                  <div class="file-slot mt-1">
                    <div class="file-path-container">
                      <strong style="color: white;">
                        {{ isPrinterPrinting(printer) ? formatFileName(printer.file_path) : $t('printerList.notPrinting') }}
                      </strong>
                    </div>
                  </div>

                  <div v-if="selectedFileName" class="file-availability-row">
                    <span :class="['file-availability-badge', fileAvailabilityClass(printer)]">
                      <v-icon size="14">{{ fileAvailabilityIcon(printer) }}</v-icon>
                      {{ fileAvailabilityLabel(printer) }}
                    </span>
                  </div>
                </div>

                <!-- Right: temperature gauges -->
                <div class="detailed-right">
                  <div class="detailed-temp-grid">
                    <div class="detailed-temp-item">
                      <v-icon size="20" :class="{ 'text-blue': printer.extruder_temperature < 60, 'text-yellow': printer.extruder_temperature >= 60 }">
                        {{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-printer-3d-nozzle-outline' }}
                      </v-icon>
                      <div class="detailed-temp-vals">
                        <span class="temp-value">{{ Math.round(printer.extruder_temperature) }}°C</span>
                        <span v-if="printer.extruder_target" class="detailed-temp-target">→ {{ Math.round(printer.extruder_target) }}°</span>
                      </div>
                      <span class="detailed-heater-badge" :class="heaterStateClass(printer.extruder_temperature, printer.extruder_target)">
                        {{ $t(`printerList.heater.${heaterStateClass(printer.extruder_temperature, printer.extruder_target).replace('heater-', '')}`) }}
                      </span>
                    </div>

                    <div class="detailed-temp-item">
                      <v-icon size="20" :class="{ 'text-blue': printer.extruder1_temperature < 60, 'text-yellow': printer.extruder1_temperature >= 60 }">
                        {{ printer.extruder2_temperature ? 'mdi-screw-machine-flat-top' : 'mdi-printer-3d-nozzle-outline' }}
                      </v-icon>
                      <div class="detailed-temp-vals">
                        <span class="temp-value">{{ Math.round(printer.extruder1_temperature) }}°C</span>
                        <span v-if="printer.extruder1_target" class="detailed-temp-target">→ {{ Math.round(printer.extruder1_target) }}°</span>
                      </div>
                      <span class="detailed-heater-badge" :class="heaterStateClass(printer.extruder1_temperature, printer.extruder1_target)">
                        {{ $t(`printerList.heater.${heaterStateClass(printer.extruder1_temperature, printer.extruder1_target).replace('heater-', '')}`) }}
                      </span>
                    </div>

                    <div class="detailed-temp-item" v-if="printer.extruder2_temperature !== null && printer.extruder2_temperature !== undefined">
                      <v-icon size="20" :class="{ 'text-blue': printer.extruder2_temperature < 60, 'text-yellow': printer.extruder2_temperature >= 60 }">
                        mdi-printer-3d-nozzle-outline
                      </v-icon>
                      <div class="detailed-temp-vals">
                        <span class="temp-value">{{ Math.round(printer.extruder2_temperature) }}°C</span>
                        <span v-if="printer.extruder2_target" class="detailed-temp-target">→ {{ Math.round(printer.extruder2_target) }}°</span>
                      </div>
                      <span class="detailed-heater-badge" :class="heaterStateClass(printer.extruder2_temperature, printer.extruder2_target)">
                        {{ $t(`printerList.heater.${heaterStateClass(printer.extruder2_temperature, printer.extruder2_target).replace('heater-', '')}`) }}
                      </span>
                    </div>

                    <div class="detailed-temp-item">
                      <v-icon size="20" :class="{ 'text-blue': printer.heater_bed_temperature < 40, 'text-yellow': printer.heater_bed_temperature >= 40 }">
                        mdi-radiator
                      </v-icon>
                      <div class="detailed-temp-vals">
                        <span class="temp-value">{{ Math.round(printer.heater_bed_temperature) }}°C</span>
                        <span v-if="printer.heater_bed_target" class="detailed-temp-target">→ {{ Math.round(printer.heater_bed_target) }}°</span>
                      </div>
                      <span class="detailed-heater-badge" :class="heaterStateClass(printer.heater_bed_temperature, printer.heater_bed_target)">
                        {{ $t(`printerList.heater.${heaterStateClass(printer.heater_bed_temperature, printer.heater_bed_target).replace('heater-', '')}`) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </v-card>
          </template>

          <template v-else-if="isFleetLayout">
            <section
              v-for="group in fleetGroups"
              :key="group.key"
              class="fleet-group"
              :class="{ 'status-column': cardLayout === 'board' }"
              :data-status="group.key"
              :aria-label="cardLayout === 'board' ? $t(`printerList.board.${group.key}`) : undefined"
            >
              <div v-if="cardLayout === 'board'" class="status-column-heading">
                <h2>{{ $t(`printerList.board.${group.key}`) }}</h2>
                <span :aria-label="$t('printerList.board.count', group.printers.length)">{{ group.printers.length }}</span>
              </div>
              <div v-if="cardLayout === 'board' && !group.printers.length" class="status-empty">
                {{ $t('printerList.board.empty') }}
              </div>
              <v-card
                v-for="printer in group.printers"
                :key="printer.ip"
                color="surface"
                class="floating-card fleet-card"
                :class="{
                  'production-card': cardLayout === 'production',
                  'preview-card': cardLayout === 'preview',
                  'slim-row-card': cardLayout === 'rows',
                  'selected-card': selectedPrinters.includes(printer.ip),
                  'locked-card': isPrinterLocked(printer),
                  'unlocked-printing-card': isPrinterPrinting(printer) && !isPrinterLocked(printer)
                }"
                :style="{ '--card-status': `rgb(var(--v-theme-${printerCardStatus(printer).color}))` }"
                @click="toggleSelection(printer)"
                @dblclick.stop="selectLockedPrinter(printer)"
              >
                <div class="fleet-header">
                  <div class="fleet-identity">
                    <a :href="printer.ui_url" target="_blank" :title="printer.hostname" class="printer-name" @click.stop @dblclick.stop>
                      {{ printer.hostname }}
                    </a>
                    <span>{{ printer.modelType || $t('printerList.unknownModel') }} · {{ printer.ip }}</span>
                  </div>
                  <v-btn
                    v-if="isPrinterPrinting(printer)"
                    icon
                    size="x-small"
                    variant="text"
                    :title="isPrinterLocked(printer) ? $t('printerList.lock.unlock') : $t('printerList.lock.lock')"
                    :aria-label="isPrinterLocked(printer) ? $t('printerList.lock.unlock') : $t('printerList.lock.lock')"
                    @click.stop="togglePrinterLock(printer)"
                    @dblclick.stop
                  >
                    <v-icon :color="isPrinterLocked(printer) ? 'primary' : 'success'">
                      {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                    </v-icon>
                  </v-btn>
                </div>

                <div class="fleet-status">
                  <v-icon size="18">{{ printerCardStatus(printer).icon }}</v-icon>
                  <span>{{ $t(`printerList.status.${printerCardStatus(printer).key}`) }}</span>
                </div>

                <div v-if="cardLayout === 'production'" class="production-hero">
                  <strong v-if="isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'">
                    {{ printPercent(printer) }}<small>%</small>
                  </strong>
                  <v-icon v-else size="44" :color="printerCardStatus(printer).color">
                    {{ printerCardStatus(printer).icon }}
                  </v-icon>
                  <span>{{ $t(isPrinterPrinting(printer) ? 'printerList.columns.progress' : 'printerList.notPrinting') }}</span>
                </div>

                <PrintPreview
                  v-else-if="cardLayout === 'preview'"
                  :base-url="printer.base_url"
                  :filename="isPrinterPrinting(printer) ? formatFileName(printer.file_path) : ''"
                />

                <div v-else-if="cardLayout === 'thermal'" class="thermal-grid">
                  <div
                    v-for="temp in cardTemperatures(printer)"
                    :key="temp.label"
                    class="thermal-cell"
                    :data-heater-state="thermalState(temp.current, temp.target)"
                  >
                    <div class="thermal-heading">
                      <v-icon size="18">{{ temp.icon }}</v-icon>
                      <span>{{ temp.label }}</span>
                      <small>{{ $t(`printerList.heater.${thermalState(temp.current, temp.target)}`) }}</small>
                    </div>
                    <strong>{{ Math.round(temp.current) }}<small>°C</small></strong>
                    <div class="thermal-target">
                      {{ $t('printerList.card.target') }}
                      <span>{{ validTemperatureTarget(temp.target) === null ? $t('printerList.card.targetUnavailable') : `${validTemperatureTarget(temp.target)?.toFixed(0)}°C` }}</span>
                    </div>
                    <v-progress-linear
                      v-if="(validTemperatureTarget(temp.target) ?? 0) > 0"
                      :model-value="temperatureProgress(temp.current, temp.target)"
                      color="primary"
                      height="4"
                      rounded
                      :aria-label="$t('printerList.card.targetProgress', { heater: temp.label })"
                    />
                  </div>
                  <div v-if="!cardTemperatures(printer).length" class="fleet-message">{{ $t('printerList.card.noTemperatures') }}</div>
                </div>

                <WebcamSnapshot v-else-if="cardLayout === 'webcam'" :base-url="printer.base_url" :ui-url="printer.ui_url" />

                <CustomCardSections v-else-if="activeCustomLayout" :sections="activeCustomLayout.sections" :printer="customCardData(printer)" />

                <div v-if="!activeCustomLayout || getTransientStatus(printer) || printer.state_message !== 'Printer is ready' || selectedFileName" class="fleet-job">
                  <div v-if="!activeCustomLayout" class="fleet-filename" :title="isPrinterPrinting(printer) ? formatFileName(printer.file_path) : ''">
                    <v-icon size="16">mdi-file-outline</v-icon>
                    <span>{{ isPrinterPrinting(printer) ? formatFileName(printer.file_path) : $t('printerList.notPrinting') }}</span>
                    <strong v-if="cardLayout !== 'production' && isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'">
                      {{ printPercent(printer) }}%
                    </strong>
                  </div>
                  <v-progress-linear
                    v-if="!activeCustomLayout && isPrinterPrinting(printer) && printer.state_message === 'Printer is ready'"
                    :model-value="printPercent(printer)"
                    color="primary"
                    :height="6"
                    rounded
                    :aria-label="$t('printerList.columns.progress')"
                  />
                  <div v-if="getTransientStatus(printer)" class="fleet-message" :class="transientStatusClass(printer)">
                    {{ getTransientStatus(printer) }}
                  </div>
                  <div v-else-if="printer.state_message !== 'Printer is ready'" class="fleet-message text-error">
                    {{ formatPrinterError(printer.state_message) }}
                  </div>
                  <span v-if="selectedFileName" :class="['file-availability-badge', fileAvailabilityClass(printer)]">
                    <v-icon size="14">{{ fileAvailabilityIcon(printer) }}</v-icon>
                    {{ fileAvailabilityLabel(printer) }}
                  </span>
                </div>

                <div v-if="cardLayout !== 'thermal' && !activeCustomLayout" class="fleet-temperatures">
                  <div v-for="temp in cardTemperatures(printer)" :key="temp.label" class="fleet-temperature">
                    <span>{{ temp.label }}</span>
                    <strong>{{ Math.round(temp.current) }}°<small v-if="temp.target"> → {{ Math.round(temp.target) }}°</small></strong>
                  </div>
                  <span v-if="!cardTemperatures(printer).length" class="fleet-message">{{ $t('printerList.card.noTemperatures') }}</span>
                </div>
              </v-card>
            </section>
          </template>

          <!-- ==================== DEFAULT LAYOUT ==================== -->
          <template v-else>
            <v-card
              v-for="printer in sortedPrinters"
              :key="printer.ip"
              color="surface"
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
                :title="isPrinterLocked(printer) ? $t('printerList.lock.unlock') : $t('printerList.lock.lock')"
              >
                <v-icon :color="isPrinterLocked(printer) ? 'yellow' : 'green'">
                  {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                </v-icon>
              </v-btn>
            </div>

            <v-divider>
              <v-card-title class="text-h6">
                <a :href="printer.ui_url" target="_blank" class="printer-name">{{ printer.hostname }}</a>
              </v-card-title>
            </v-divider>

            <v-divider></v-divider>

            <!-- body is a flex column so temps can pin to bottom -->
            <v-card-text class="card-body">
              <div class="printer-type">
                <v-icon :color="printer.extruder2_temperature ? 'cyan' : 'cyan'">
                  {{ printer.extruder2_temperature ? 'mdi-filter' : 'mdi-movie-roll' }}
                </v-icon>
                <span style="margin-left: 8px;">
                  <strong>{{ printer.modelType || $t('printerList.unknownModel') }}</strong>
                  <br />
                  <span class="printer-ip">
                    <v-icon small color="green" style="vertical-align: middle; margin-right: 4px;">mdi-wifi</v-icon>{{ printer.ip }}
                  </span>
                  <span class="version-badge ml-2" :class="printer.helm_version ? 'version-badge-versioned' : 'version-badge-legacy'">
                    {{ printer.helm_version ? `v${printer.helm_version}` : $t('printerList.version.legacy') }}
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
                        : $t('printerList.notPrinting')
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
                      <span class="text-red">{{ $t('printerList.status.error') }}</span>
                    </template>

                    <template v-else-if="isPrinterBusy(printer)">
                      <v-icon class="text-orange">mdi-timer-sand</v-icon>
                      <span class="text-orange">{{ $t('printerList.status.busy') }}</span>
                    </template>

                    <template v-else-if="isPrinterPrinting(printer)">
                      <v-icon>mdi-printer-3d-nozzle</v-icon>
                      {{ $t('printerList.status.printing') }}
                    </template>

                    <template v-else-if="isReady(printer)">
                      <v-icon>mdi-home</v-icon>
                      {{ $t('printerList.status.homed') }}
                    </template>

                    <template v-else-if="isIdle(printer)">
                      <v-icon>mdi-engine-off</v-icon>
                      {{ $t('printerList.status.disengaged') }}
                    </template>

                    <template v-else>
                      {{ $t('printerList.status.unknown') }}
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
                    {{ formatPrinterError(printer.state_message) }}
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
                  </div>
                  <span class="temp-label"></span>
                  <span class="temp-value">{{ Math.round(printer.heater_bed_temperature) }}°C</span>
                </div>
              </div>
            </v-card-text>
          </v-card>
          </template>
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
              <th style="width: 18%">{{ $t('printerList.columns.hostname') }}</th>
              <th style="width: 13%">{{ $t('printerList.columns.type') }}</th>
              <th style="width: 10%">{{ $t('printerList.columns.version') }}</th>
              <th style="width: 13%">{{ $t('printerList.columns.status') }}</th>
              <th style="width: 13%">{{ $t('printerList.columns.progress') }}</th>
              <th style="width: 29%">{{ $t('printerList.columns.printFile') }}</th>
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
                  :title="isPrinterLocked(printer) ? $t('printerList.lock.unlock') : $t('printerList.lock.lock')"
                >
                  <v-icon :color="isPrinterLocked(printer) ? 'yellow' : 'green'">
                    {{ isPrinterLocked(printer) ? 'mdi-lock' : 'mdi-lock-open-variant' }}
                  </v-icon>
                </v-btn>
              </td>

              <td class="printer-name">{{ printer.hostname }}</td>
              <td>{{ printer.extruder2_temperature ? $t('printerList.printerType.pellet') : $t('printerList.printerType.filament') }}</td>
              <td>
                <span class="version-badge" :class="printer.helm_version ? 'version-badge-versioned' : 'version-badge-legacy'">
                  {{ printer.helm_version ? `v${printer.helm_version}` : $t('printerList.version.legacy') }}
                </span>
              </td>
              <td>
                <span v-if="getTransientStatus(printer)" :class="transientStatusClass(printer)">
                  {{ getTransientStatus(printer) }}
                </span>
                <span v-else>
                  <span v-if="isPrinterBusy(printer)" class="text-orange">{{ $t('printerList.status.busy') }}</span>
                  <span v-else>{{ printer.status }}</span>
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
                  {{ isPrinterPrinting(printer) ? formatFileName(printer.file_path) : $t('printerList.notPrinting') }}
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
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { selectedPrinters, cardsOnlyMode } from '../store/printerStore';
import { apiFetch } from '../api';
import { scannerCidr, printerBaseUrlByIp, printerTransientStatusByIp, selectedPrintFile, refreshFileListFromBackend } from './commandService';
import { SUPPORTED_LOCALES } from '../i18n';
import type { LocaleCode } from '../i18n';
import PrintPreview from './PrintPreview.vue';
import WebcamSnapshot from './WebcamSnapshot.vue';
import CardLayoutBuilder from './CardLayoutBuilder.vue';
import CustomCardSections from './CustomCardSections.vue';
import { copyCardLayout, defaultCardSections, parseCustomCardLayouts } from './cardLayouts';
import type { CustomCardLayout, CustomCardData } from './cardLayouts';

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
  helm_version?: string | null;

  derived_printing?: boolean;
}

type PrinterCache = {
  lastPrintingAt?: number;
  lastKnownStatus?: string;
  lastKnownStateMessage?: string;
  lastKnownFilePath?: string;
};

type SortMode = 'dynamic' | 'dynamic-printing-first' | 'alphabetical' | 'custom';
type FileAvailability = 'checking' | 'exists' | 'missing' | 'error';

export default defineComponent({
  name: 'PrinterGrid',
  components: { PrintPreview, WebcamSnapshot, CardLayoutBuilder, CustomCardSections },
  setup() {
    const { locale, t } = useI18n();
    const cardsOnlyTrigger = ref<HTMLButtonElement | null>(null);
    watch(cardsOnlyMode, async (active, previous) => {
      if (!active && previous) {
        await nextTick();
        if (!cardsOnlyMode.value) cardsOnlyTrigger.value?.focus();
      }
    });
    const currentLocale = computed<LocaleCode>({
      get: () => locale.value as LocaleCode,
      set: (val: LocaleCode) => {
        locale.value = val;
        localStorage.setItem('helm-locale', val);
      },
    });

    const printers = ref<Printer[]>([]);
    const isLoading = ref(true);
    const showSortSettings = ref(false);
    const showNetworkSettings = ref(false);
    const showLanguageSettings = ref(false);
    const networkCidr = ref(scannerCidr.value);

    const openNetworkSettings = () => {
      networkCidr.value = scannerCidr.value;
      showNetworkSettings.value = true;
    };

    const saveNetworkSettings = () => {
      const trimmed = networkCidr.value.trim();
      if (!trimmed) return;
      scannerCidr.value = trimmed;
      localStorage.setItem('printerScannerCidr', trimmed);
      refreshFileListFromBackend(trimmed);
      showNetworkSettings.value = false;
    };
    const sortMode = ref<SortMode>('dynamic');
    const customOrder = ref<string[]>([]);

    const layoutOptions = [
      { value: 'default', icon: 'mdi-card-outline' },
      { value: 'compact', icon: 'mdi-view-grid-compact' },
      { value: 'detailed', icon: 'mdi-card-text-outline' },
      { value: 'production', icon: 'mdi-view-dashboard-outline' },
      { value: 'preview', icon: 'mdi-image-outline' },
      { value: 'rows', icon: 'mdi-view-agenda-outline' },
      { value: 'board', icon: 'mdi-view-column-outline' },
      { value: 'thermal', icon: 'mdi-thermometer' },
      { value: 'webcam', icon: 'mdi-webcam' },
    ] as const;
    type CardLayout = typeof layoutOptions[number]['value'] | `custom:${string}`;
    const CARD_LAYOUT_KEY = 'printerCardLayout';
    const CUSTOM_LAYOUTS_KEY = 'printerCustomCardLayouts';
    const customCardLayouts = ref<CustomCardLayout[]>([]);
    const layoutStorageError = ref('');
    const cardLayout = ref<CardLayout>('detailed');
    try {
      customCardLayouts.value = parseCustomCardLayouts(localStorage.getItem(CUSTOM_LAYOUTS_KEY));
      const saved = localStorage.getItem(CARD_LAYOUT_KEY);
      const builtin = layoutOptions.find(option => option.value === saved);
      const custom = customCardLayouts.value.find(layout => `custom:${layout.id}` === saved);
      if (builtin) cardLayout.value = builtin.value;
      else if (custom) cardLayout.value = `custom:${custom.id}`;
      else if (saved?.startsWith('custom:')) throw new Error('Selected custom card layout is missing');
    } catch (error) {
      console.warn('[CardLayoutBuilder] Could not load layouts:', error);
      layoutStorageError.value = t('cardBuilder.loadFailed');
    }
    const showLayoutSettings = ref(false);
    const showCardBuilder = ref(false);
    const builderLayout = ref<CustomCardLayout>({ id: '', name: '', sections: defaultCardSections() });
    const pendingLayoutDelete = ref<CustomCardLayout | null>(null);
    const activeCustomLayout = computed(() => customCardLayouts.value.find(layout => `custom:${layout.id}` === cardLayout.value));
    const setCardLayout = (val: CardLayout) => {
      cardLayout.value = val;
      if (val.startsWith('custom:')) viewType.value = 'grid';
    };
    const isFleetLayout = computed(() => !!activeCustomLayout.value || ['production', 'preview', 'rows', 'board', 'thermal', 'webcam'].includes(cardLayout.value));
    watch(cardLayout, (val) => {
      try {
        localStorage.setItem(CARD_LAYOUT_KEY, val);
      } catch (error) {
        console.warn('[CardLayoutBuilder] Could not save selected layout:', error);
        layoutStorageError.value = t('cardBuilder.saveFailed');
      }
    });

    const openCardBuilder = (layout?: CustomCardLayout, duplicate = false) => {
      builderLayout.value = layout ? copyCardLayout(layout) : { id: '', name: '', sections: defaultCardSections() };
      if (duplicate) {
        builderLayout.value.id = '';
        builderLayout.value.name = `${builderLayout.value.name} (${t('cardBuilder.copy')})`.slice(0, 60);
      }
      showLayoutSettings.value = false;
      showCardBuilder.value = true;
    };
    const persistCustomCardLayouts = (layouts: CustomCardLayout[]) => {
      try {
        localStorage.setItem(CUSTOM_LAYOUTS_KEY, JSON.stringify({ version: 1, layouts }));
        customCardLayouts.value = layouts;
        layoutStorageError.value = '';
        return true;
      } catch (error) {
        console.warn('[CardLayoutBuilder] Could not save layouts:', error);
        layoutStorageError.value = t('cardBuilder.saveFailed');
        return false;
      }
    };
    const saveCustomCardLayout = (layout: CustomCardLayout) => {
      const saved = copyCardLayout({
        ...layout,
        id: layout.id || `layout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
      const layouts = [...customCardLayouts.value];
      const index = layouts.findIndex(item => item.id === saved.id);
      if (index < 0) layouts.push(saved);
      else layouts[index] = saved;
      if (!persistCustomCardLayouts(layouts)) return;
      setCardLayout(`custom:${saved.id}`);
      showCardBuilder.value = false;
    };
    const deleteCustomCardLayout = () => {
      const layout = pendingLayoutDelete.value;
      if (!layout) return;
      if (!persistCustomCardLayouts(customCardLayouts.value.filter(item => item.id !== layout.id))) return;
      if (cardLayout.value === `custom:${layout.id}`) setCardLayout('detailed');
      pendingLayoutDelete.value = null;
    };

    const unlockedWhilePrinting = ref<Set<string>>(new Set());
    const cacheByIp = ref<Record<string, PrinterCache>>({});
    const selectedFileAvailabilityByIp = ref<Record<string, FileAvailability>>({});
    const selectedFileName = computed(() => String(selectedPrintFile.value || '').trim());
    let fileAvailabilityRun = 0;

    const SORT_MODE_KEY = 'printerListSortMode';
    const SORT_ORDER_KEY = 'printerListCustomOrder';

    const PRINTING_GRACE_MS = 4_000;
    const POLL_INTERVAL_MS = 1_000;
    const DEVICE_POLL_TIMEOUT_MS = 30_000;
    const MODEL_CONFIG_TIMEOUT_MS = 5_000;
    const MODEL_RETRY_DELAY_MS = 60_000;

    const normalizeStatus = (s?: string | null) => (s ?? '').trim().toLowerCase();
    const isReady = (p: Printer) => normalizeStatus(p.status) === 'ready';
    const isIdle = (p: Printer) => normalizeStatus(p.status) === 'idle';

    const isPrinterBusy = (p: Printer) => {
      const s = normalizeStatus(p.status);
      if (s === 'busy' || s.includes('busy')) return true;
      // status=printing with no file means a G-code script is running, not a print job
      if (s === 'printing' && !(typeof p.file_path === 'string' && p.file_path.trim().length > 0)) return true;
      return false;
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
      // Must have an actual file to be considered printing (not just running a G-code script)
      return typeof p.file_path === 'string' && p.file_path.trim().length > 0;
    };

    const hasStrongPrintingEvidence = (p: Printer) => {
      const hasFile = typeof p.file_path === 'string' && p.file_path.trim().length > 0;
      const hasProgress =
        typeof p.print_progress === 'number' &&
        p.print_progress > 0 &&
        p.print_progress < 1;
      return rawIsPrinting(p) || (hasProgress && hasFile);
    };

    const isPrinterPrinting = (p: Printer) => {
      if (typeof p.derived_printing === 'boolean') return p.derived_printing;
      return rawIsPrinting(p);
    };

    const isPrinterLocked = (p: Printer) => {
      return isPrinterPrinting(p) && !unlockedWhilePrinting.value.has(p.ip);
    };

    const formatPrinterError = (message: string) => {
      return message.replace(/\s*\bOnce the (?:underlying|underlaying) issue\b[\s\S]*$/i, '');
    };

    const printerCardStatus = (p: Printer) => {
      if (p.state_message !== 'Printer is ready') return { key: 'error', color: 'error', icon: 'mdi-alert-circle-outline' };
      if (isPrinterBusy(p)) return { key: 'busy', color: 'warning', icon: 'mdi-timer-sand' };
      if (isPrinterPrinting(p)) return { key: 'printing', color: 'primary', icon: 'mdi-printer-3d-nozzle' };
      if (isReady(p)) return { key: 'homed', color: 'success', icon: 'mdi-check-circle-outline' };
      if (isIdle(p)) return { key: 'disengaged', color: 'muted', icon: 'mdi-engine-off-outline' };
      return { key: 'unknown', color: 'muted', icon: 'mdi-help-circle-outline' };
    };

    const printPercent = (p: Printer) => {
      return Number.isFinite(p.print_progress) ? Math.round(Math.max(0, Math.min(1, p.print_progress)) * 100) : 0;
    };

    const cardTemperatures = (p: Printer) => {
      const readings = [
        { label: 'E0', icon: 'mdi-printer-3d-nozzle', current: p.extruder_temperature, target: p.extruder_target },
        { label: 'E1', icon: 'mdi-printer-3d-nozzle', current: p.extruder1_temperature, target: p.extruder1_target },
        { label: 'E2', icon: 'mdi-printer-3d-nozzle', current: p.extruder2_temperature, target: p.extruder2_target },
        { label: t('printerList.card.bed'), icon: 'mdi-radiator', current: p.heater_bed_temperature, target: p.heater_bed_target },
      ];
      return readings.filter(temp => typeof temp.current === 'number' && Number.isFinite(temp.current));
    };

    const validTemperatureTarget = (target?: number | null) => {
      return typeof target === 'number' && Number.isFinite(target) && target >= 0 ? target : null;
    };

    const thermalState = (current: number, target?: number | null) => {
      const valid = validTemperatureTarget(target);
      if (valid === null) return 'unknown';
      if (valid > 0 && current > valid + 2) return 'cooling';
      return heaterState(current, valid);
    };

    const temperatureProgress = (current: number, target?: number | null) => {
      const valid = validTemperatureTarget(target);
      return valid ? Math.max(0, Math.min(100, current / valid * 100)) : 0;
    };

    const customCardData = (printer: Printer): CustomCardData => ({
      baseUrl: printer.base_url,
      uiUrl: printer.ui_url,
      printing: isPrinterPrinting(printer),
      ready: printer.state_message === 'Printer is ready',
      filename: formatFileName(printer.file_path),
      progress: printPercent(printer),
      temperatures: cardTemperatures(printer).map(temp => ({
        ...temp,
        target: validTemperatureTarget(temp.target),
        state: thermalState(temp.current, temp.target),
        progress: temperatureProgress(temp.current, temp.target),
      })),
    });

    const togglePrinterLock = (p: Printer) => {
      if (!isPrinterPrinting(p)) return;
      const s = new Set(unlockedWhilePrinting.value);
      if (s.has(p.ip)) s.delete(p.ip);
      else s.add(p.ip);
      unlockedWhilePrinting.value = s;
    };

    let fetchInterval: number | null = null;
    let fetchController: AbortController | null = null;
    let isUnmounted = false;
    const modelRequests = new Map<string, AbortController>();
    const modelRetryAfter = new Map<string, number>();
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
      const printingFirst = sortMode.value === 'dynamic-printing-first';
      return [...printers.value].sort((a, b) => {
        const ap = printing(a);
        const bp = printing(b);

        if (ap !== bp) return ap === printingFirst ? -1 : 1;
        return byNameThenIp(a, b);
      });
    });

    const fleetGroups = computed(() => {
      if (cardLayout.value !== 'board') return [{ key: 'all', printers: sortedPrinters.value }];
      const statuses = ['printing', 'homed', 'busy', 'error', 'disengaged', 'unknown'] as const;
      return statuses
        .map(key => ({
          key,
          printers: sortedPrinters.value.filter(printer => printerCardStatus(printer).key === key),
        }))
        .filter(group => group.printers.length > 0 || (group.key !== 'disengaged' && group.key !== 'unknown'));
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
        if (rawMode === 'dynamic' || rawMode === 'dynamic-printing-first' || rawMode === 'alphabetical' || rawMode === 'custom') {
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
      if (fetchController || isUnmounted) return;
      const controller = new AbortController();
      fetchController = controller;
      const timeout = window.setTimeout(() => controller.abort(), DEVICE_POLL_TIMEOUT_MS);
      try {
        const force = !!opts?.force;
        const cidr = scannerCidr.value;
        const path = force ? `/api/devices?force=1&cidr=${encodeURIComponent(cidr)}` : `/api/devices?cidr=${encodeURIComponent(cidr)}`;
        const data = await apiFetch<Printer[]>(path, { signal: controller.signal });
        if (controller.signal.aborted || isUnmounted) return;
        updatePrinters(data);
        isLoading.value = false;
      } catch (error) {
        if (!isUnmounted) {
          console.error(controller.signal.aborted
            ? 'Device poll timed out; retrying on the next poll:'
            : 'Failed to fetch devices:', error);
        }
      } finally {
        window.clearTimeout(timeout);
        fetchController = null;
      }
    };

    const fetchModelType = async (printer: Printer) => {
      const baseUrl = printer.base_url;
      if (isUnmounted || printer.modelType || modelRequests.has(baseUrl) ||
          Date.now() < (modelRetryAfter.get(baseUrl) ?? 0)) return;

      const controller = new AbortController();
      modelRequests.set(baseUrl, controller);
      const timeout = window.setTimeout(() => controller.abort(), MODEL_CONFIG_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/server/files/config/.master.cfg`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Model configuration returned HTTP ${res.status}`);
        const text = await res.text();
        if (controller.signal.aborted || isUnmounted) return;

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
        model ||= `${firstLine || ''} ${platform}`.trim();
        if (!model) throw new Error('Empty model configuration');

        printers.value.forEach((current) => {
          if (current.base_url === baseUrl) current.modelType = model;
        });
        modelRetryAfter.delete(baseUrl);
      } catch (error) {
        if (!isUnmounted) {
          modelRetryAfter.set(baseUrl, Date.now() + MODEL_RETRY_DELAY_MS);
          console.warn(controller.signal.aborted
            ? `Model lookup timed out for ${baseUrl}; retrying after one minute:`
            : `Failed to fetch model type for ${baseUrl}; retrying after one minute:`, error);
        }
      } finally {
        window.clearTimeout(timeout);
        modelRequests.delete(baseUrl);
      }
    };

    const updatePrinters = (newData: Printer[]) => {
      const updatedPrinters = [...printers.value];

      for (const device of newData) {
        // Only match by MAC when both sides have a non-empty MAC address.
        // An empty MAC (from CIDR-scan fallback on Linux) must never match another empty MAC.
        const index = device.mac
          ? updatedPrinters.findIndex((printer) => printer.mac && printer.mac === device.mac)
          : -1;
        if (index !== -1) {
          updatedPrinters[index] = mergePreferGood(updatedPrinters[index], device);
        } else {
          updatedPrinters.push({ ...device });
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

      printers.value.forEach((printer) => { void fetchModelType(printer); });
    };

    const toggleSelection = (printer: Printer) => {
      const ip = printer.ip;
      const isSelected = selectedPrinters.value.includes(ip);

      // Locked printers can be deselected but not newly selected by a click
      if (isPrinterLocked(printer)) {
        if (isSelected) {
          selectedPrinters.value = selectedPrinters.value.filter((selected) => selected !== ip);
        }
        return;
      }

      if (isSelected) {
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
      if (s === 'exists') return t('printerList.file.found');
      if (s === 'missing') return t('printerList.file.missing');
      if (s === 'error') return t('printerList.file.cannotVerify');
      return t('printerList.file.checking');
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
      cardsOnlyMode.value = false;
      isUnmounted = true;
      fileAvailabilityRun++;
      if (fetchInterval) clearInterval(fetchInterval);
      fetchController?.abort();
      modelRequests.forEach((controller) => controller.abort());
      modelRequests.clear();
      modelRetryAfter.clear();
      statusTimers.forEach((timer) => clearTimeout(timer));
      statusTimers.clear();
    });

    const restartFirmware = async () => {
      if (selectedPrinters.value.length === 0) return;

      setTransientStatusForIps([...selectedPrinters.value], 'Firmware restart sent');

      const results = await Promise.all(selectedPrinters.value.map(async (ip) => {
        const base = resolvePrinterBase(ip);
        try {
          const res = await fetch(`${base}/printer/firmware_restart`, { method: 'POST' });
          if (!res.ok) throw new Error(`Failed for ${ip}`);
          return { ip, success: true };
        } catch {
          try {
            // fallback: send FIRMWARE_RESTART via gcode script
            const fallback = await fetch(`${base}/printer/gcode/script?script=${encodeURIComponent('FIRMWARE_RESTART')}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            if (!fallback.ok) throw new Error(`Fallback failed for ${ip}`);
            return { ip, success: true };
          } catch {
            return { ip, success: false };
          }
        }
      }));

      const failedIps = results.filter(r => !r.success).map(r => r.ip);
      if (failedIps.length) setTransientStatusForIps(failedIps, 'Firmware restart failed');
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
      showNetworkSettings,
      networkCidr,
      openNetworkSettings,
      saveNetworkSettings,
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
      showLanguageSettings,
      currentLocale,
      SUPPORTED_LOCALES,
      cardLayout,
      cardsOnlyMode,
      cardsOnlyTrigger,
      layoutOptions,
      isFleetLayout,
      fleetGroups,
      printerCardStatus,
      formatPrinterError,
      printPercent,
      cardTemperatures,
      validTemperatureTarget,
      thermalState,
      temperatureProgress,
      showLayoutSettings,
      setCardLayout,
      activeCustomLayout,
      customCardLayouts,
      customCardData,
      showCardBuilder,
      builderLayout,
      openCardBuilder,
      saveCustomCardLayout,
      pendingLayoutDelete,
      deleteCustomCardLayout,
      layoutStorageError,
      t,
    };
  },
});
</script>

<style scoped>
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

.top-bar-center .view-toggle {
  height: 30px;
}

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
.cards-only-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: var(--helm-radius-sm);
  color: var(--helm-brand);
}
.cards-only-trigger:hover { background: var(--helm-raised); }
.cards-only-trigger:focus-visible { outline: 2px solid var(--helm-brand); outline-offset: 2px; }
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
  background: var(--helm-brand-dim);
  color: var(--helm-brand);
}

.order-actions {
  display: flex;
  gap: 2px;
}

/* Cards */
.floating-card {
  position: relative;
  border-radius: var(--helm-radius);
  border: 1px solid var(--helm-border);
  box-shadow: none;
  transition: border-color 0.15s, background-color 0.15s;
  cursor: pointer;

  display: flex;
  flex-direction: column;

  /* ✅ equal height per grid row for aligned heater boxes */
  height: 100%;
}
.floating-card:hover {
  border-color: var(--helm-border-strong);
}
.floating-card.selected-card {
  border-color: var(--helm-brand);
  outline: 1px solid var(--helm-brand);
  outline-offset: -2px;
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
.text-orange { color: #ff9800; }
.text-green { color: green; }
.text-grey { color: grey; }
.text-red { color: red; }

a:link, a:visited { color: var(--helm-fg); text-decoration: none; }
a:hover, a:active { color: var(--helm-brand); }

.status-container {
  background: var(--helm-nav);
  border-radius: 8px;
  padding: 6px 12px;
  border: 1px solid var(--helm-border);
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
  background: var(--helm-nav);
  border-radius: 8px;
  padding: 8px;
  border: 1px solid var(--helm-border);
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

.selected-row {
  background: var(--helm-raised);
  box-shadow: inset 2px 0 0 var(--helm-brand);
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
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

.printer-list-root.cards-only-root {
  padding: 0;
  gap: 0;
}

.printer-list-root > .v-card {
  border: none;
  border-radius: 0;
  background-image: none;
  padding: 0 !important;
}

/* ==================== LAYOUT PICKER DIALOG ==================== */
.layout-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.layout-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px 8px;
  border-radius: var(--helm-radius);
  border: 2px solid var(--helm-border);
  cursor: pointer;
  color: var(--helm-fg);
  font: inherit;
  background: transparent;
  transition: border-color 0.2s, background 0.2s;
}
.layout-option:hover {
  border-color: var(--helm-border-strong);
  background: var(--helm-raised);
}
.layout-option-active {
  border-color: var(--helm-brand) !important;
  background: var(--helm-brand-dim) !important;
}

.layout-option:focus-visible {
  outline: 2px solid var(--helm-brand);
  outline-offset: 2px;
}

.custom-layout-heading { display: flex; align-items: center; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin: 24px 0 12px; }
.custom-layout-heading h2 { font-size: 16px; }
.custom-layout-row { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; min-width: 0; }
.custom-layout-choice { display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1; padding: 12px; border: 2px solid var(--helm-border); border-radius: 8px; text-align: left; }
.custom-layout-choice > span { min-width: 0; overflow-wrap: anywhere; }
.custom-layout-choice:focus-visible { outline: 2px solid var(--helm-brand); outline-offset: 2px; }

.layout-production,
.layout-preview {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  align-items: stretch;
}
.layout-thermal,
.layout-webcam,
.layout-custom {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  align-items: stretch;
}
.thermal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.thermal-cell {
  --thermal-color: var(--helm-muted);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  background: var(--helm-nav);
  border: 1px solid var(--helm-border);
  border-top: 2px solid var(--thermal-color);
  border-radius: var(--helm-radius-sm);
}
.thermal-cell:only-child {
  grid-column: 1 / -1;
}
.thermal-cell[data-heater-state="heating"] { --thermal-color: rgb(var(--v-theme-warning)); }
.thermal-cell[data-heater-state="on"] { --thermal-color: rgb(var(--v-theme-success)); }
.thermal-cell[data-heater-state="cooling"] { --thermal-color: rgb(var(--v-theme-info)); }
.thermal-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--thermal-color);
  font-size: 12px;
}
.thermal-heading small {
  margin-left: auto;
  font-size: 10px;
}
.thermal-cell > strong {
  font-size: 36px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.thermal-cell > strong small {
  margin-left: 3px;
  color: var(--helm-muted);
  font-size: 14px;
  font-weight: 400;
}
.thermal-target {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px;
  color: var(--helm-muted);
  font-size: 11px;
}
.fleet-group {
  display: contents;
}
.layout-rows {
  grid-template-columns: minmax(0, 1fr);
  container-type: inline-size;
}
.layout-board {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  align-items: start;
}
.status-column {
  --column-status: var(--helm-muted);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--helm-border);
  border-radius: var(--helm-radius);
  background: var(--helm-nav);
}
.status-column[data-status="printing"] { --column-status: var(--helm-brand); }
.status-column[data-status="homed"] { --column-status: rgb(var(--v-theme-success)); }
.status-column[data-status="busy"] { --column-status: rgb(var(--v-theme-warning)); }
.status-column[data-status="error"] { --column-status: rgb(var(--v-theme-error)); }
.status-column-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 4px 12px;
  border-bottom: 2px solid var(--column-status);
}
.status-column-heading h2 {
  font-size: 14px;
  font-weight: 600;
}
.status-column-heading > span {
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--helm-raised);
  color: var(--helm-muted);
  text-align: center;
  font-size: 12px;
}
.status-empty {
  padding: 24px 8px;
  color: var(--helm-muted);
  font-size: 12px;
  text-align: center;
}
.status-column .fleet-card {
  height: auto;
  padding: 12px;
}
.fleet-card {
  padding: 16px;
  gap: 14px;
  min-width: 0;
}
.fleet-header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.fleet-identity {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.fleet-identity a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 17px;
  font-weight: 700;
}
.fleet-identity > span {
  color: var(--helm-muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.fleet-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--helm-nav);
  border-left: 3px solid var(--card-status);
  border-radius: 4px;
  color: var(--card-status);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.production-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 100px;
}
.production-hero > strong {
  font-size: 56px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -2px;
}
.production-hero small {
  font-size: 24px;
  color: var(--helm-muted);
  margin-left: 4px;
}
.production-hero > span {
  color: var(--helm-muted);
  font-size: 11px;
}
.fleet-job {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fleet-filename {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
}
.fleet-filename > span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fleet-filename > strong {
  color: var(--helm-brand);
  font-variant-numeric: tabular-nums;
}
.fleet-message {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.fleet-temperatures {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--helm-border);
}
.fleet-temperature {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
}
.fleet-temperature > span,
.fleet-temperature small {
  color: var(--helm-muted);
  font-size: 10px;
  font-weight: 400;
}
.slim-row-card {
  display: grid;
  grid-template-columns: minmax(160px, 1.1fr) minmax(100px, 0.65fr) minmax(180px, 1.4fr) minmax(180px, 1fr);
  align-items: center;
  gap: 20px;
  height: auto;
}
.slim-row-card .fleet-temperatures {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
  justify-content: flex-end;
}
.slim-row-card .fleet-header,
.slim-row-card .fleet-job {
  min-width: 0;
}
@container (max-width: 900px) {
  .slim-row-card {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 14px;
  }
  .slim-row-card .fleet-temperatures {
    justify-content: flex-start;
  }
}
@container (max-width: 520px) {
  .slim-row-card {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
}

/* ==================== COMPACT LAYOUT ==================== */
.layout-compact {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
  gap: 12px !important;
}
.compact-card {
  border-radius: 10px !important;
  min-height: unset !important;
  height: auto !important;
}
.compact-top-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.compact-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: grey;
}
.dot-printing { background: #FFBD00; box-shadow: 0 0 6px #FFBD00; }
.dot-ready { background: #4CAF50; }
.dot-idle { background: #9E9E9E; }
.dot-error { background: #F44336; box-shadow: 0 0 6px #F44336; }
.dot-busy { background: #FF9800; }
.compact-hostname {
  font-weight: 700;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

/* ==================== VERSION BADGE ==================== */
.version-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 99px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  flex-shrink: 0;
}
.version-badge-versioned {
  background: rgba(0, 188, 212, 0.15);
  color: #4DD0E1;
  border: 1px solid rgba(0, 188, 212, 0.35);
}
.version-badge-legacy {
  background: rgba(255, 152, 0, 0.15);
  color: #FFB74D;
  border: 1px solid rgba(255, 152, 0, 0.35);
}
.compact-lock-btn {
  flex-shrink: 0;
  height: 20px !important;
  width: 20px !important;
  min-width: 20px !important;
}
.compact-temps {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.7rem;
  opacity: 0.8;
}
.compact-temp {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* ==================== DETAILED LAYOUT ==================== */
.layout-detailed {
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)) !important;
  gap: 24px !important;
}
.detailed-card {
  border-radius: 14px !important;
}
.skel-bone {
  background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.5s infinite;
}
@keyframes skel-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.detailed-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.detailed-model-row {
  display: flex;
  align-items: center;
  font-size: 0.8rem;
  opacity: 0.75;
  margin-top: 2px;
}
.detailed-ip {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.75rem;
  opacity: 0.6;
}
.detailed-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 4px;
}
.detailed-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  overflow: hidden;
}
.detailed-right {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.detailed-temp-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px;
}
.detailed-temp-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.detailed-temp-vals {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 1;
}
.detailed-temp-target {
  font-size: 0.7rem;
  opacity: 0.5;
}
.detailed-heater-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
}
.heater-off { color: #9E9E9E; background: rgba(158, 158, 158, 0.15); }
.heater-on { color: #FF9800; background: rgba(255, 152, 0, 0.15); }
.heater-heating { color: #FF5722; background: rgba(255, 87, 34, 0.15); animation: pulse-heat 1.2s ease-in-out infinite; }
@keyframes pulse-heat {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
