import { ref } from 'vue';
import { selectedPrinters } from '../store/printerStore'; // Import the shared ref
import { commandValues } from '../store/commandValues'; // Import command mapping

type CommandType = 'button' | 'number' | 'dropdown';

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
}
export const commandGroups = ref([
  {
    title: 'Print',
    icon: 'mdi-file',
    open: false,
    commands: [
      { type: 'button', label: 'Start Print', color: 'green', variant: 'tonal', icon: 'mdi-play' },
      { type: 'button', label: 'Pause', color: 'yellow', variant: 'tonal', icon: 'mdi-pause' },
      { type: 'button', label: 'Cancel', color: 'red', variant: 'outlined', icon: 'mdi-stop' },
      { type: 'dropdown', label: 'Select File' }
    ]
  },
  {
    title: 'Movement',
    icon: 'mdi-cursor-move',
    open: false,
    commands: [
      { type: 'button', label: 'Home All Axes' },
      {
        type: 'number',
        label: 'Move X',
        min: -200,
        max: 200,
        default: 0,
        unit: 'mm'
      },
      {
        type: 'number',
        label: 'Move Y',
        min: -200,
        max: 200,
        default: 0,
        unit: 'mm'
      },
      {
        type: 'number',
        label: 'Move Z',
        min: 0,
        max: 200,
        default: 0,
        unit: 'mm'
      }
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

/**
 * Function to simulate running a command with mapped values.
 * Logs output to the console for each selected printer.
 * @param command - The command to execute.
 */
export const runCommand = (command: CommandConfig, value?: number | string) => {
  if (selectedPrinters.value.length === 0) {
    console.warn("No printers selected. Cannot execute command.");
    return;
  }

  // Get the mapped value for the command
  const commandValue = commandValues[command] || 'UNKNOWN_COMMAND';

  // Iterate over each selected printer and log the message individually
  selectedPrinters.value.forEach((printerIp) => {
    console.log(`This command is being run: ${commandValue} for the device ${printerIp}`);
  });
};
