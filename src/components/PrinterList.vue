<template>
    <div class="printer-list">
      <base-card>
        <h2>Printer Fleet</h2>
        <ul>
          <li v-for="printer in printers" :key="printer.ip">
            <p>{{ printer.hostname }} ({{ printer.ip }})</p>
          </li>
        </ul>
      </base-card>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  import BaseCard from '../components/Cards/Card.vue';
  
  interface Printer {
    hostname: string;
    ip: string;
    status: string;
    extruder_temperature: number;
  }
  
  export default defineComponent({
    components: { BaseCard },
    setup() {
      const printers = ref<Printer[]>([]);
  
      const fetchPrinters = async () => {
        const response = await fetch('/api/devices');
        printers.value = await response.json();
      };
  
      onMounted(fetchPrinters);
  
      return { printers };
    },
  });
  </script>
  