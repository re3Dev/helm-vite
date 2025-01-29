import { ref } from 'vue';

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
