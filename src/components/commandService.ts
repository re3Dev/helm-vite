// src/config/commandGroups.ts (or wherever this file lives)
import { ref } from 'vue';
import { selectedPrinters } from '../store/printerStore'; // shared ref
import { commandValues } from '../store/commandValues';   // command mapping

type CommandType = 'button' | 'number' | 'dropdown' | 'gcode-input' | 'file-upload';

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
  accept?: string[];   // For file inputs
  gridPos?: [number, number];

  // Step size selector buttons (100/10/1)
  stepSize?: number;

  // Movement buttons (direction only; distance comes from selectedStepSize)
  move?: {
    axis: 'X' | 'Y' | 'Z' | 'XY';
    dir: 1 | -1 | [1 | -1, 1 | -1]; // XY uses [xDir, yDir]
  };
}

export const commandGroups = ref<
  Array<{
    title: string;
    icon: string;
    open: boolean;
    commands: CommandConfig[];
  }>
>([
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
        accept: ['.gcode', '.txt'],
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
      },
    ],
  },
  {
    title: 'Movement',
    icon: 'mdi-cursor-move',
    open: false,
    commands: [
      // Step size selector buttons (highlight handled by helpers below)
      { type: 'button', label: '100mm', color: 'grey', variant: 'tonal', stepSize: 100 },
      { type: 'button', label: '10mm', color: 'grey', variant: 'tonal', stepSize: 10 },
      { type: 'button', label: '1mm', color: 'grey', variant: 'tonal', stepSize: 1 },

      // 3x3 grid movement buttons (direction only)
      { type: 'button', label: '', icon: 'mdi-arrow-top-left', color: 'grey', variant: 'outlined', gridPos: [0, 0], move: { axis: 'XY', dir: [-1, 1] } },
      { type: 'button', label: '', icon: 'mdi-arrow-up', color: 'grey', variant: 'outlined', gridPos: [0, 1], move: { axis: 'Y', dir: 1 } },
      { type: 'button', label: '', icon: 'mdi-arrow-top-right', color: 'grey', variant: 'outlined', gridPos: [0, 2], move: { axis: 'XY', dir: [1, 1] } },

      { type: 'button', label: '', icon: 'mdi-arrow-left', color: 'grey', variant: 'outlined', gridPos: [1, 0], move: { axis: 'X', dir: -1 } },
      { type: 'button', label: 'Home', icon: 'mdi-home', color: 'blue', variant: 'tonal', gridPos: [1, 1] },
      { type: 'button', label: '', icon: 'mdi-arrow-right', color: 'grey', variant: 'outlined', gridPos: [1, 2], move: { axis: 'X', dir: 1 } },

      { type: 'button', label: '', icon: 'mdi-arrow-bottom-left', color: 'grey', variant: 'outlined', gridPos: [2, 0], move: { axis: 'XY', dir: [-1, -1] } },
      { type: 'button', label: '', icon: 'mdi-arrow-down', color: 'grey', variant: 'outlined', gridPos: [2, 1], move: { axis: 'Y', dir: -1 } },
      { type: 'button', label: '', icon: 'mdi-arrow-bottom-right', color: 'grey', variant: 'outlined', gridPos: [2, 2], move: { axis: 'XY', dir: [1, -1] } },
    ],
  },
  {
    title: 'Temperature',
    icon: 'mdi-thermometer',
    open: false,
    commands: [
      { type: 'number', label: 'Set E0 Temp', min: 0, max: 120, default: 60, unit: '°C' },
      { type: 'number', label: 'Set E1 Temp', min: 0, max: 300, default: 200, unit: '°C' },
      { type: 'number', label: 'Set E2 Temp', min: 0, max: 300, default: 200, unit: '°C' },
      { type: 'number', label: 'Set Bed Temp', min: 0, max: 120, default: 60, unit: '°C' },
    ],
  },
  {
    title: 'Material',
    icon: 'mdi-flask',
    open: false,
    commands: [
      { type: 'dropdown', label: 'Select Material', options: ['PLA', 'PETG', 'ABS', 'TPU'] },
      { type: 'button', label: 'Load Filament' },
      { type: 'button', label: 'Unload Filament' },
    ],
  },
]);

export { selectedPrinters };

// Step size toggle state
export const stepSizes = [100, 10, 1] as const;
export const selectedStepSize = ref<number>(10);

/**
 * Helpers for UI highlighting step-size buttons
 * (Use these when rendering the buttons in your component)
 */
export const isStepButton = (command: CommandConfig) => typeof command.stepSize === 'number';

export const getCommandButtonColor = (command: CommandConfig) => {
  if (isStepButton(command)) {
    return selectedStepSize.value === command.stepSize ? 'primary' : (command.color ?? 'grey');
  }
  return command.color ?? 'grey';
};

export const getCommandButtonVariant = (command: CommandConfig) => {
  if (isStepButton(command)) {
    // selected looks more “active”
    return selectedStepSize.value === command.stepSize ? 'elevated' : (command.variant ?? 'tonal');
  }
  return command.variant ?? 'tonal';
};

// Optional: for an outline/border/active class if you want it
export const getStepActiveClass = (command: CommandConfig) => {
  if (!isStepButton(command)) return '';
  return selectedStepSize.value === command.stepSize ? 'step-active' : '';
};

/**
 * Command-to-G-code mapping for direct API calls
 */
const gcodeCommandMap: Record<string, string> = {
  'Check Endstops': 'M119',
  'Home All Axes': 'G28',
  // Add more mappings as needed
};

export const runCommand = async (command: CommandConfig, value?: number | string) => {
    // Step size toggle buttons
  if (typeof command.stepSize === 'number') {
    selectedStepSize.value = command.stepSize;
    console.log(`Selected step size: ${selectedStepSize.value}mm`);
    return;
  }
  
  if (selectedPrinters.value.length === 0) {
    console.warn('No printers selected. Cannot execute command.');
    return;
  }

  // Movement arrows: use selectedStepSize
  if (command.move) {
    const step = selectedStepSize.value;

    let script = '';
    if (command.move.axis === 'XY') {
      const [xDir, yDir] = command.move.dir as [1 | -1, 1 | -1];
      const x = xDir * step;
      const y = yDir * step;
      script = `G91\nG1 X${x} Y${y} F6000\nG90`;
    } else {
      const dir = command.move.dir as 1 | -1;
      const dist = dir * step;
      script = `G91\nG1 ${command.move.axis}${dist} F6000\nG90`;
    }

    await Promise.all(
      selectedPrinters.value.map(async (ip) => {
        try {
          await fetch(`http://${ip}/printer/gcode/script?script=${encodeURIComponent(script)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log(`Move sent to printer ${ip}: ${script.replace(/\n/g, ' | ')}`);
        } catch (e) {
          console.warn(`Error sending move to printer ${ip}:`, e);
        }
      }),
    );

    return;
  }

  // Handle arbitrary G-code input
  if (command.type === 'gcode-input' && typeof value === 'string' && value.trim() !== '') {
    await Promise.all(
      selectedPrinters.value.map(async (ip) => {
        try {
          await fetch(`http://${ip}/printer/gcode/script?script=${encodeURIComponent(value)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log(`G-code (${value}) sent to printer ${ip}`);
        } catch (e) {
          console.warn(`Error sending G-code (${value}) to printer ${ip}:`, e);
        }
      }),
    );
    return;
  }

  // If the command is mapped to a G-code, send it to all selected printers
  const gcode = gcodeCommandMap[command.label];
  if (gcode) {
    await Promise.all(
      selectedPrinters.value.map(async (ip) => {
        try {
          await fetch(`http://${ip}/printer/gcode/script?script=${encodeURIComponent(gcode)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          console.log(`${command.label} (${gcode}) sent to printer ${ip}`);
        } catch (e) {
          console.warn(`Error sending ${command.label} to printer ${ip}:`, e);
        }
      }),
    );
    return;
  }

  // Fallback: log the mapped value if not a G-code command
  const commandValue = commandValues[command.label] || 'UNKNOWN_COMMAND';
  selectedPrinters.value.forEach((printerIp) => {
    console.log(`This command is being run: ${commandValue} for the device ${printerIp}`);
  });
};
