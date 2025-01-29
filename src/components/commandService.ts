import { ref } from 'vue';
import { selectedPrinters } from '../store/printerStore'; // Import the shared ref

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
 * Test function to simulate running a command.
 * Instead of making an API request, it logs output to the console.
 * @param command - The command to execute.
 */
export const runCommand = (command: string) => {
  if (selectedPrinters.value.length === 0) {
    console.warn("No printers selected. Cannot execute command.");
    return;
  }

  console.log("TEST: Running command:", command);
  console.log("Selected Printers:", selectedPrinters.value);

  // Simulate a delay to mimic request behavior
  setTimeout(() => {
    console.log(`Command "${command}" simulated successfully for:`, selectedPrinters.value);
  }, 1000);
};
