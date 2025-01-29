import { ref } from 'vue';
import { selectedPrinters } from '../store/printerStore'; // Import the shared ref
import { commandValues } from '../store/commandValues'; // Import command mapping

// Define command groups
export const commandGroups = ref([
  {
    title: 'Calibration',
    icon: 'mdi-tools',
    open: false,
    commands: ['Bed Level', 'Extruder Calibration']
  },
  {
    title: 'Material',
    icon: 'mdi-flask',
    open: false,
    commands: ['Load Filament', 'Unload Filament', 'Purge']
  },
  {
    title: 'Movement',
    icon: 'mdi-robot',
    open: false,
    commands: ['Home All Axes', 'Move X', 'Move Y', 'Move Z']
  }
]);

export { selectedPrinters };

/**
 * Function to simulate running a command with mapped values.
 * Logs output to the console for each selected printer.
 * @param command - The command to execute.
 */
export const runCommand = (command: string) => {
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
