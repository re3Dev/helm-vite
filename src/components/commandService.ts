import { ref } from 'vue';
import { selectedPrinters } from '../store/printerStore'; // Import the shared ref
import { commandValues } from '../store/commandValues'; // Import command mapping

type CommandType = 'button' | 'number' | 'dropdown' | 'gcode-input';

interface CommandConfig {
  type: CommandType;
  label: string;
  icon?: string;       // For buttons
  options?: string[];  // For dropdowns
  min?: number;        // For number inputs
  max?: number;        // For number inputs
  default?: number;    // For number inputs
  unit?: string;       // For number inputs (e.g., '°C', 'mm')
  color?: string;      // For buttons
  variant?: string;    // For buttons
  accept?: string[];     // For file inputs
  move?: { axis: 'X' | 'Y' | 'Z', value: number }; // For movement commands
}
export const commandGroups = ref([
  {
    title: 'Print',
    icon: 'mdi-file',
    open: false,
    commands: [
      { type: 'button', label: 'Start Print', color: 'green', variant: 'tonal', icon: 'mdi-play' },
      { type: 'dropdown', label: 'Select File' },
      { 
        type: 'file-upload',
        label: 'Upload File',
        icon: 'mdi-upload',
        color: 'red',
        variant: 'tonal',
        accept: ['.gcode', '.txt']
      },
      {
        type: 'button',
        label: 'Check Endstops',
        color: 'blue',
        variant: 'tonal',
        icon: 'mdi-gesture-tap-button',
      },
      {
        type: 'gcode-input',
        label: 'G-code Terminal',
        icon: 'mdi-console',
        color: 'grey',
        variant: 'outlined',
      }
    ]
  },
  {
    title: 'Movement',
    icon: 'mdi-cursor-move',
    open: false,
    commands: [
      // Step size selector buttons (above the grid)
      { type: 'button', label: '100mm', color: 'grey', variant: 'tonal', stepSize: 100 },
      { type: 'button', label: '10mm', color: 'grey', variant: 'tonal', stepSize: 10 },
      { type: 'button', label: '1mm', color: 'grey', variant: 'tonal', stepSize: 1 },
      // 3x3 grid: Diagonals included for full movement control
      { type: 'button', label: '', icon: 'mdi-arrow-top-left', color: 'grey', variant: 'outlined', gridPos: [0,0], move: { axis: 'XY', value: [ -10, 10 ] } },
      { type: 'button', label: '', icon: 'mdi-arrow-up', color: 'grey', variant: 'outlined', gridPos: [0,1], move: { axis: 'Y', value: 10 } },
      { type: 'button', label: '', icon: 'mdi-arrow-top-right', color: 'grey', variant: 'outlined', gridPos: [0,2], move: { axis: 'XY', value: [ 10, 10 ] } },
      { type: 'button', label: '', icon: 'mdi-arrow-left', color: 'grey', variant: 'outlined', gridPos: [1,0], move: { axis: 'X', value: -10 } },
      { type: 'button', label: 'Home', icon: 'mdi-home', color: 'blue', variant: 'tonal', gridPos: [1,1] },
      { type: 'button', label: '', icon: 'mdi-arrow-right', color: 'grey', variant: 'outlined', gridPos: [1,2], move: { axis: 'X', value: 10 } },
      { type: 'button', label: '', icon: 'mdi-arrow-bottom-left', color: 'grey', variant: 'outlined', gridPos: [2,0], move: { axis: 'XY', value: [ -10, -10 ] } },
      { type: 'button', label: '', icon: 'mdi-arrow-down', color: 'grey', variant: 'outlined', gridPos: [2,1], move: { axis: 'Y', value: -10 } },
      { type: 'button', label: '', icon: 'mdi-arrow-bottom-right', color: 'grey', variant: 'outlined', gridPos: [2,2], move: { axis: 'XY', value: [ 10, -10 ] } },
    ]
  },
  {
    title: 'Temperature',
    icon: 'mdi-thermometer',
    open: false,
    commands: [
      { 
        type: 'number',
        label: 'Set E0 Temp',
        min: 0,
        max: 120,
        default: 60,
        unit: '°C'
      },
      {
        type: 'number',
        label: 'Set E1 Temp',
        min: 0,
        max: 300,
        default: 200,
        unit: '°C'
      },
      {
      type: 'number',
      label: 'Set E2 Temp',
      min: 0,
      max: 300,
      default: 200,
      unit: '°C'
      },
      { 
        type: 'number',
        label: 'Set Bed Temp',
        min: 0,
        max: 120,
        default: 60,
        unit: '°C'
      },
    ]
  },
  {
    title: 'Material',
    icon: 'mdi-flask',
    open: false,
    commands: [
      {
        type: 'dropdown',
        label: 'Select Material',
        options: ['PLA', 'PETG', 'ABS', 'TPU']
      },
      { type: 'button', label: 'Load Filament' },
      { type: 'button', label: 'Unload Filament' }
    ]
  }
]);

export { selectedPrinters };

// Step size toggle state
export const stepSizes = [100, 10, 1];
export const selectedStepSize = ref(10);

/**
 * Command-to-G-code mapping for direct API calls
 */
const gcodeCommandMap: Record<string, string> = {
  'Check Endstops': 'M119',
  'Home All Axes': 'G28',
  // Add more mappings as needed
};

export const runCommand = async (command: CommandConfig, value?: number | string) => {
  if (selectedPrinters.value.length === 0) {
    console.warn("No printers selected. Cannot execute command.");
    return;
  }

  // Handle arbitrary G-code input
  if (command.type === 'gcode-input' && typeof value === 'string' && value.trim() !== '') {
    await Promise.all(selectedPrinters.value.map(async (ip) => {
      try {
        await fetch(`http://${ip}/printer/gcode/script?script=${encodeURIComponent(value)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log(`G-code (${value}) sent to printer ${ip}`);
      } catch (e) {
        // Ignore errors (CORS, etc.)
        console.warn(`Error sending G-code (${value}) to printer ${ip}:`, e);
      }
    }));
    return;
  }

  // If the command is mapped to a G-code, send it to all selected printers
  const gcode = gcodeCommandMap[command.label];
  if (gcode) {
    await Promise.all(selectedPrinters.value.map(async (ip) => {
      try {
        await fetch(`http://${ip}/printer/gcode/script?script=${encodeURIComponent(gcode)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log(`${command.label} (${gcode}) sent to printer ${ip}`);
      } catch (e) {
        // Ignore errors (CORS, etc.)
        console.warn(`Error sending ${command.label} to printer ${ip}:`, e);
      }
    }));
    return;
  }

  // Fallback: log the mapped value if not a G-code command
  const commandValue = commandValues[command.label] || 'UNKNOWN_COMMAND';
  selectedPrinters.value.forEach((printerIp) => {
    console.log(`This command is being run: ${commandValue} for the device ${printerIp}`);
  });
};
