// src/config/commandGroups.ts
import { ref } from 'vue'
import { selectedPrinters } from '../store/printerStore' // shared ref
import { commandValues } from '../store/commandValues' // command mapping

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

  // Step size selector buttons (100/10/1)
  stepSize?: number

  // Movement buttons (direction only; distance comes from selectedStepSize)
  move?: {
    axis: 'X' | 'Y' | 'Z' | 'XY'
    dir: 1 | -1 | [1 | -1, 1 | -1] // XY uses [xDir, yDir]
  }

  // Explicit UI-role tags so Z buttons don't get mixed up when you invert directions
  zRole?: 'up' | 'down'
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
      { type: 'button', label: 'Start Print', color: 'green', variant: 'tonal', icon: 'mdi-play' },
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
      {
        type: 'button',
        label: 'Check Endstops',
        color: 'blue',
        variant: 'tonal',
        icon: 'mdi-gesture-tap-button'
      },
      {
        type: 'gcode-input',
        label: 'G-code Terminal',
        icon: 'mdi-console',
        color: 'grey',
        variant: 'outlined'
      }
    ]
  },
  {
    title: 'Movement',
    icon: 'mdi-cursor-move',
    open: false,
    commands: [
      // Step size selector buttons
      { type: 'button', label: '100mm', color: 'grey', variant: 'tonal', stepSize: 100 },
      { type: 'button', label: '10mm', color: 'grey', variant: 'tonal', stepSize: 10 },
      { type: 'button', label: '1mm', color: 'grey', variant: 'tonal', stepSize: 1 },

      // 3x3 grid movement buttons (direction only)
      { type: 'button', label: '', icon: 'mdi-arrow-top-left', color: 'grey', variant: 'outlined', gridPos: [0, 0], move: { axis: 'XY', dir: [-1, 1] } },
      { type: 'button', label: '', icon: 'mdi-arrow-up', color: 'grey', variant: 'outlined', gridPos: [0, 1], move: { axis: 'Y', dir: 1 } },
      { type: 'button', label: '', icon: 'mdi-arrow-top-right', color: 'grey', variant: 'outlined', gridPos: [0, 2], move: { axis: 'XY', dir: [1, 1] } },

      { type: 'button', label: '', icon: 'mdi-arrow-left', color: 'grey', variant: 'outlined', gridPos: [1, 0], move: { axis: 'X', dir: -1 } },
      { type: 'button', label: 'Home All Axes', icon: 'mdi-home', color: 'blue', variant: 'tonal', gridPos: [1, 1] },
      { type: 'button', label: '', icon: 'mdi-arrow-right', color: 'grey', variant: 'outlined', gridPos: [1, 2], move: { axis: 'X', dir: 1 } },

      { type: 'button', label: '', icon: 'mdi-arrow-bottom-left', color: 'grey', variant: 'outlined', gridPos: [2, 0], move: { axis: 'XY', dir: [-1, -1] } },
      { type: 'button', label: '', icon: 'mdi-arrow-down', color: 'grey', variant: 'outlined', gridPos: [2, 1], move: { axis: 'Y', dir: -1 } },
      { type: 'button', label: '', icon: 'mdi-arrow-bottom-right', color: 'grey', variant: 'outlined', gridPos: [2, 2], move: { axis: 'XY', dir: [1, -1] } },

      // Z controls (your inverted behavior)
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

// Step size toggle state
export const stepSizes = [100, 10, 1] as const
export const selectedStepSize = ref<number>(10)

// Print selection state (global for now)
const selectedPrintFile = ref<string>('') // filename relative to gcodes root
const lastUploadedFile = ref<string>('')

/**
 * Helpers
 */
function getFirstSelectedPrinter(): string | null {
  return selectedPrinters.value.length ? selectedPrinters.value[0] : null
}

function toOneFile(value: unknown): File | null {
  // Vuetify can deliver File | File[] | null (and sometimes event-ish shapes)
  if (!value) return null
  if (value instanceof File) return value
  if (Array.isArray(value)) return (value[0] instanceof File ? value[0] : null)

  // Some UI libs pass { target: { files: FileList } }
  const maybeFiles = (value as any)?.target?.files
  if (maybeFiles && maybeFiles.length && maybeFiles[0] instanceof File) return maybeFiles[0]

  return null
}

function updatePrintDropdownOptions(options: string[]) {
  const printGroup = commandGroups.value.find(g => g.title === 'Print')
  if (!printGroup) return
  const dropdown = printGroup.commands.find(c => c.type === 'dropdown' && c.label === 'Select File')
  if (!dropdown) return
  dropdown.options = options
}

/**
 * Fetch file list from Moonraker (gcodes root) and update dropdown.
 * Uses: GET /server/files/list?root=gcodes :contentReference[oaicite:2]{index=2}
 */
async function refreshFileListFromPrinter(base: string): Promise<string[]> {
  const url = `http://${base}/server/files/list?root=gcodes`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`File list failed (${res.status})`)
  const data = await res.json()

  // Moonraker returns an array of file info objects for this endpoint
  const paths = Array.isArray(data) ? data.map((x: any) => x?.path).filter(Boolean) : []
  // sort a little nicer
  paths.sort((a: string, b: string) => a.localeCompare(b))
  updatePrintDropdownOptions(paths)
  return paths
}

/**
 * Upload a file to Moonraker using multipart/form-data:
 * POST /server/files/upload with form fields: file, root=gcodes, optional path, optional print=true :contentReference[oaicite:3]{index=3}
 */
async function uploadGcodeToPrinter(base: string, file: File, opts?: { path?: string; autoPrint?: boolean }) {
  const fd = new FormData()
  fd.append('file', file, file.name)
  fd.append('root', 'gcodes')
  if (opts?.path) fd.append('path', opts.path)
  // If you want Moonraker to start immediately after upload:
  // fd.append('print', opts?.autoPrint ? 'true' : 'false')
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
  // Example response includes: data.item.path :contentReference[oaicite:4]{index=4}
  const uploadedPath = data?.item?.path as string | undefined
  if (uploadedPath) {
    lastUploadedFile.value = uploadedPath
    selectedPrintFile.value = uploadedPath
  }
  return data
}

/**
 * Start print by filename.
 * Moonraker supports POST /printer/print/start?filename=... (query), recommended body is ok too :contentReference[oaicite:5]{index=5}
 */
async function startPrintOnPrinter(base: string, filename: string) {
  const url = `http://${base}/printer/print/start?filename=${encodeURIComponent(filename)}`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Start print failed (${res.status}): ${text}`)
  }
  return res.json().catch(() => ({}))
}

/**
 * Command-to-G-code mapping for direct API calls
 */
const gcodeCommandMap: Record<string, string> = {
  'Check Endstops': 'M119',
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
        try {
          await fetch(`http://${base}/printer/gcode/script?script=${encodeURIComponent(script)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          console.log(`Move sent to printer ${base}: ${script.replace(/\n/g, ' | ')}`)
        } catch (e) {
          console.warn(`Error sending move to printer ${base}:`, e)
        }
      })
    )
    return
  }

  // Handle file upload (real Moonraker upload)
if (command.type === 'file-upload') {
  const file = toOneFile(value)
  if (!file) {
    console.warn('No file selected.')
    return { ok: false, total: 0, success: 0, failed: 0 }
  }

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

  // Refresh dropdown from the first selected printer so the new file shows up
  const first = getFirstSelectedPrinter()
  if (first) {
    try {
      await refreshFileListFromPrinter(first)
    } catch (e) {
      console.warn('File list refresh failed:', e)
    }
  }

  // Let the UI show exact outcome
  return { ok: failed === 0, total, success, failed }
}


  // Dropdown select (Select File)
  if (command.type === 'dropdown' && command.label === 'Select File') {
    const filename = String(value ?? '').trim()
    selectedPrintFile.value = filename
    console.log('Selected file:', selectedPrintFile.value)
    return
  }

  // Refresh file list button
  if (command.type === 'button' && command.label === 'Refresh File List') {
    const first = getFirstSelectedPrinter()
    if (!first) return
    try {
      await refreshFileListFromPrinter(first)
      console.log('File list refreshed')
    } catch (e) {
      console.warn('File list refresh failed:', e)
    }
    return
  }

  // Start print (uses selected file; falls back to last uploaded file)
  if (command.type === 'button' && command.label === 'Start Print') {
    const filename = (selectedPrintFile.value || lastUploadedFile.value).trim()
    if (!filename) {
      console.warn('No file selected (and no recent upload). Choose a file first.')
      return
    }

    await Promise.all(
      selectedPrinters.value.map(async (base) => {
        try {
          const resp = await startPrintOnPrinter(base, filename)
          console.log(`Started print on ${base}: ${filename}`, resp)
        } catch (e) {
          console.warn(`Start print failed on ${base}:`, e)
        }
      })
    )
    return
  }

  // Handle arbitrary G-code input
  if (command.type === 'gcode-input' && typeof value === 'string' && value.trim() !== '') {
    await Promise.all(
      selectedPrinters.value.map(async (base) => {
        try {
          await fetch(`http://${base}/printer/gcode/script?script=${encodeURIComponent(value)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          console.log(`G-code (${value}) sent to printer ${base}`)
        } catch (e) {
          console.warn(`Error sending G-code (${value}) to printer ${base}:`, e)
        }
      })
    )
    return
  }

  // If the command is mapped to a G-code, send it to all selected printers
  const gcode = gcodeCommandMap[command.label]
  if (gcode) {
    await Promise.all(
      selectedPrinters.value.map(async (base) => {
        try {
          await fetch(`http://${base}/printer/gcode/script?script=${encodeURIComponent(gcode)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
          console.log(`${command.label} (${gcode}) sent to printer ${base}`)
        } catch (e) {
          console.warn(`Error sending ${command.label} to printer ${base}:`, e)
        }
      })
    )
    return
  }

  // Fallback
  const commandValue = commandValues[command.label] || 'UNKNOWN_COMMAND'
  selectedPrinters.value.forEach((printerBase) => {
    console.log(`This command is being run: ${commandValue} for the device ${printerBase}`)
  })
}
