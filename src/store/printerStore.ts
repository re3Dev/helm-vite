import { ref } from 'vue';

// Global reactive reference for selected printers
export const selectedPrinters = ref<string[]>([]);
export const cardsOnlyMode = ref(false);
