// src/config/commandGroups.ts
import { ref } from 'vue'
import { selectedPrinters } from '../store/printerStore'
import { commandValues } from '../store/commandValues'
import { apiFetch } from '../api'

type CommandType = 'button' | 'number' | 'dropdown' | 'gcode-input' | 'file-upload'

interface CommandConfig {
  type: CommandType
  label: string
  icon?: string
  options?: string[]
  min?: number
  max?: number
  default?: number
  unit?: string
  color?: string
  variant?: string
  accept?: string[]
  gridPos?: [number, number]
  stepSize?: number
  move?: {
    axis: 'X' | 'Y' | 'Z' | 'XY'
    dir: 1 | -1 | [1 | -1, 1 | -1]
  }
  zRole?: 'up' | 'down'

  // OPTIONAL hint to render print controls in a row (sidebar uses this)
  ui?: 'print-controls'
}

export const commandGroups = ref<
  Array<{
    title: string
    icon: string
    open: boolean
    commands: CommandConfig[]
  }>
>([
  {
    title: 'Print',
    icon: 'mdi-file',
    open: false,
    commands: [
      // ✅ Print controls row
      { type: 'button', label: 'Start Print', color: 'green', variant: 'tonal', icon: 'mdi-play', ui: 'print-controls' },
      { type: 'button', label: 'Pause Print', color: 'yellow', variant: 'tonal', icon: 'mdi-pause', ui: 'print-controls' },
      { type: 'button', label: 'Stop Print', color: 'red', variant: 'tonal', icon: 'mdi-stop', ui: 'print-controls' },

      // File selection + upload
      { type: 'dropdown', label: 'Select File', options: [] },
      {
        type: 'file-upload',
        label: 'Upload File',
        icon: 'mdi-upload',
        color: 'red',
        variant: 'tonal',
        accept: ['.gcode', '.txt']
      },
      { type: 'button', label: 'Refresh File List', color: 'grey', variant: 'outlined', icon: 'mdi-refresh' },

      // ✅ Keep terminal
      { type: 'gcode-input', label: 'G-code Terminal', icon: 'mdi-console', color: 'grey', variant: 'outlined' }
    ]
  },
  {
    title: 'Movement',
    icon: 'mdi-cursor-move',
    open: false,
    commands: [
      { type: 'button', label: '100mm', color: 'grey', variant: 'tonal', stepSize: 100 },
      { type: 'button', label: '10mm', color: 'grey', variant: 'tonal', stepSize: 10 },
      { type: 'button', label: '1mm', color: 'grey', variant: 'tonal', stepSize: 1 },

      { type: 'button', label: '', icon: 'mdi-arrow-top-left', color: 'grey', variant: 'outlined', gridPos: [0, 0], move: { axis: 'XY', dir: [-1, 1] } },
      { type: 'button', label: '', icon: 'mdi-arrow-up', color: 'grey', variant: 'outlined', gridPos: [0, 1], move: { axis: 'Y', dir: 1 } },
      { type: 'button', label: '', icon: 'mdi-arrow-top-right', color: 'grey', variant: 'outlined', gridPos: [0, 2], move: { axis: 'XY', dir: [1, 1] } },

      { type: 'button', label: '', icon: 'mdi-arrow-left', color: 'grey', variant: 'outlined', gridPos: [1, 0], move: { axis: 'X', dir: -1 } },
      { type: 'button', label: 'Home All Axes', icon: 'mdi-home', color: 'blue', variant: 'tonal', gridPos: [1, 1] },
      { type: 'button', label: '', icon: 'mdi-arrow-right', color: 'grey', variant: 'outlined', gridPos: [1, 2], move: { axis: 'X', dir: 1 } },

      { type: 'button', label: '', icon: 'mdi-arrow-bottom-left', color: 'grey', variant: 'outlined', gridPos: [2, 0], move: { axis: 'XY', dir: [-1, -1] } },
      { type: 'button', label: '', icon: 'mdi-arrow-down', color: 'grey', variant: 'outlined', gridPos: [2, 1], move: { axis: 'Y', dir: -1 } },
      { type: 'button', label: '', icon: 'mdi-arrow-bottom-right', color: 'grey', variant: 'outlined', gridPos: [2, 2], move: { axis: 'XY', dir: [1, -1] } },

      { type: 'button', label: 'Z+', icon: 'mdi-arrow-up-bold', color: 'grey', variant: 'outlined', move: { axis: 'Z', dir: -1 }, zRole: 'up' },
      { type: 'button', label: 'Z-', icon: 'mdi-arrow-down-bold', color: 'grey', variant: 'outlined', move: { axis: 'Z', dir: 1 }, zRole: 'down' }
    ]
  },
  {
    title: 'Temperature',
    icon: 'mdi-thermometer',
    open: false,
    commands: [
      { type: 'number', label: 'Set E0 Temp', min: 0, max: 120, default: 60, unit: '°C' },
      { type: 'number', label: 'Set E1 Temp', min: 0, max: 300, default: 200, unit: '°C' },
      { type: 'number', label: 'Set E2 Temp', min: 0, max: 300, default: 200, unit: '°C' },
      { type: 'number', label: 'Set Bed Temp', min: 0, max: 120, default: 60, unit: '°C' }
    ]
  },
  {
    title: 'Material',
    icon: 'mdi-flask',
    open: false,
    commands: [
      { type: 'dropdown', label: 'Select Material', options: ['PLA', 'PETG', 'ABS', 'TPU'] },
      { type: 'button', label: 'Load Filament' },
      { type: 'button', label: 'Unload Filament' }
    ]
  }
])

export { selectedPrinters }
export const stepSizes = [100, 10, 1] as const
export const selectedStepSize = ref<number>(10)

// Reactive gcode files list
export const gcodeFiles = ref<string[]>([])

// Print selection state (global for now)
const selectedPrintFile = ref<string>('') // filename relative to gcodes root
const lastUploadedFile = ref<string>('')



function toOneFile(value: unknown): File | null {
  if (!value) return null
  if (value instanceof File) return value
  if (Array.isArray(value)) return (value[0] instanceof File ? value[0] : null)
  const maybeFiles = (value as any)?.target?.files
  if (maybeFiles && maybeFiles.length && maybeFiles[0] instanceof File) return maybeFiles[0]
  return null
}

function updatePrintDropdownOptions(options: string[]) {
  console.log('[UpdateDropdown] Attempting to update dropdown with', options.length, 'options')
  
  // Update reactive ref
  gcodeFiles.value = options
  console.log('[UpdateDropdown] Updated gcodeFiles ref')
  
  // Also update in commandGroups for backwards compatibility
  const printGroup = commandGroups.value.find(g => g.title === 'Print')
  console.log('[UpdateDropdown] Print group found:', !!printGroup)
  
  if (!printGroup) {
    console.error('[UpdateDropdown] Print group not found!')
    return
  }
  
  const dropdown = printGroup.commands.find(c => c.type === 'dropdown' && c.label === 'Select File')
  console.log('[UpdateDropdown] Dropdown found:', !!dropdown)
  
  if (!dropdown) {
    console.error('[UpdateDropdown] Dropdown command not found!')
    return
  }
  
  dropdown.options = options
  console.log('[UpdateDropdown] Dropdown options updated:', dropdown.options)
}



async function refreshFileListFromBackend(): Promise<string[]> {
  try {
    console.log('[GcodeList] Fetching gcode files from /api/gcodes')
    const data = await apiFetch<{ count: number; files: string[] }>('/api/gcodes')
    console.log('[GcodeList] Full response received:', JSON.stringify(data, null, 2))
    console.log('[GcodeList] data.files:', data?.files)
    console.log('[GcodeList] data.count:', data?.count)
    console.log('[GcodeList] typeof data:', typeof data)
    console.log('[GcodeList] data keys:', Object.keys(data || {}))
    
    const files = Array.isArray(data?.files) ? data.files : []
    console.log('[GcodeList] Extracted files:', files)
    
    files.sort((a: string, b: string) => a.localeCompare(b))
    console.log('[GcodeList] Sorted files:', files)
    
    updatePrintDropdownOptions(files)
    console.log('[GcodeList] Updated dropdown with', files.length, 'files')
    
    return files
  } catch (err) {
    console.error('[GcodeList] Failed to fetch gcode files from backend:', err)
    return []
  }
}

export { refreshFileListFromBackend }

async function uploadGcodeToPrinter(base: string, file: File, opts?: { path?: string; autoPrint?: boolean }) {
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('root', 'gcodes')
  if (opts?.path) fd.append('path', opts.path)
  fd.append('print', opts?.autoPrint ? 'true' : 'false')

  const res = await fetch(`http://${base}/server/files/upload`, {
    method: 'POST',
    body: fd
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  const uploadedPath = data?.item?.path as string | undefined
  if (uploadedPath) {
    lastUploadedFile.value = uploadedPath
    selectedPrintFile.value = uploadedPath
  }
  return data
}

async function startPrintOnPrinter(base: string, filename: string) {
  const url = `http://${base}/printer/print/start?filename=${encodeURIComponent(filename)}`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Start print failed (${res.status}): ${text}`)
  }
  return res.json().catch(() => ({}))
}

async function pausePrintOnPrinter(base: string) {
  // Moonraker: /printer/print/pause
  const res = await fetch(`http://${base}/printer/print/pause`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Pause failed (${res.status}): ${text}`)
  }
  return res.json().catch(() => ({}))
}

async function stopPrintOnPrinter(base: string) {
  // Moonraker: /printer/print/cancel
  const res = await fetch(`http://${base}/printer/print/cancel`, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Stop failed (${res.status}): ${text}`)
  }
  return res.json().catch(() => ({}))
}

/**
 * G-code mapping (kept minimal now)
 */
const gcodeCommandMap: Record<string, string> = {
  'Home All Axes': 'G28'
}

export const runCommand = async (command: CommandConfig, value?: any) => {
  // Step size toggle buttons
  if (typeof command.stepSize === 'number') {
    selectedStepSize.value = command.stepSize
    console.log(`Selected step size: ${selectedStepSize.value}mm`)
    return
  }

  if (selectedPrinters.value.length === 0) {
    console.warn('No printers selected. Cannot execute command.')
    return
  }

  // Movement arrows: use selectedStepSize
  if (command.move) {
    const step = selectedStepSize.value

    let script = ''
    if (command.move.axis === 'XY') {
      const [xDir, yDir] = command.move.dir as [1 | -1, 1 | -1]
      const x = xDir * step
      const y = yDir * step
      script = `G91\nG1 X${x} Y${y} F6000\nG90`
    } else {
      const dir = command.move.dir as 1 | -1
      const dist = dir * step
      script = `G91\nG1 ${command.move.axis}${dist} F6000\nG90`
    }

    await Promise.all(
      selectedPrinters.value.map(async (base) => {
        await fetch(`http://${base}/printer/gcode/script?script=${encodeURIComponent(script)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // Upload file (returns summary for UI)
  if (command.type === 'file-upload') {
    const file = toOneFile(value)
    if (!file) return { ok: false, total: 0, success: 0, failed: 0 }

    const autoPrint = false
    const uploadPath = ''

    const results = await Promise.allSettled(
      selectedPrinters.value.map(async (base) => {
        const resp = await uploadGcodeToPrinter(base, file, {
          path: uploadPath || undefined,
          autoPrint
        })
        return { base, resp }
      })
    )

    const total = results.length
    const success = results.filter(r => r.status === 'fulfilled').length
    const failed = total - success

    // Refresh file list from backend
    try {
      await refreshFileListFromBackend()
    } catch {}

    return { ok: failed === 0, total, success, failed }
  }

  // Dropdown: select file
  if (command.type === 'dropdown' && command.label === 'Select File') {
    const filename = String(value ?? '').trim()
    selectedPrintFile.value = filename
    return
  }

  // Refresh file list
  if (command.type === 'button' && command.label === 'Refresh File List') {
    await refreshFileListFromBackend()
    return
  }

  // Start / Pause / Stop print
  if (command.type === 'button' && command.label === 'Start Print') {
    const filename = (selectedPrintFile.value || lastUploadedFile.value).trim()
    if (!filename) {
      console.warn('No file selected (and no recent upload).')
      return { ok: false }
    }

    const results = await Promise.allSettled(
      selectedPrinters.value.map(async (base) => startPrintOnPrinter(base, filename))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    return { ok: failed === 0 }
  }

  if (command.type === 'button' && command.label === 'Pause Print') {
    const results = await Promise.allSettled(
      selectedPrinters.value.map(async (base) => pausePrintOnPrinter(base))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    return { ok: failed === 0 }
  }

  if (command.type === 'button' && command.label === 'Stop Print') {
    const results = await Promise.allSettled(
      selectedPrinters.value.map(async (base) => stopPrintOnPrinter(base))
    )
    const failed = results.filter(r => r.status === 'rejected').length
    return { ok: failed === 0 }
  }

  // G-code terminal
  if (command.type === 'gcode-input' && typeof value === 'string' && value.trim() !== '') {
    await Promise.all(
      selectedPrinters.value.map(async (base) => {
        await fetch(`http://${base}/printer/gcode/script?script=${encodeURIComponent(value)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return { ok: true }
  }

  // mapped gcode buttons (left for future)
  const gcode = gcodeCommandMap[command.label]
  if (gcode) {
    await Promise.all(
      selectedPrinters.value.map(async (base) => {
        await fetch(`http://${base}/printer/gcode/script?script=${encodeURIComponent(gcode)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // fallback
  const commandValue = commandValues[command.label] || 'UNKNOWN_COMMAND'
  selectedPrinters.value.forEach((printerIp) => {
    console.log(`This command is being run: ${commandValue} for the device ${printerIp}`)
  })
}
