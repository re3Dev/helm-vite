<template>
    <div class="printer-list">
      <h2>Printer Fleet</h2>
      <table>
        <thead>
          <tr>
            <th>Hostname</th>
            <th>IP Address</th>
            <th>Status</th>
            <th>Extruder Temp (°C)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="printer in printers" :key="printer.ip">
            <td>{{ printer.hostname }}</td>
            <td>{{ printer.ip }}</td>
            <td>{{ printer.status }}</td>
            <td>{{ printer.extruder_temperature }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref, onMounted } from 'vue';
  
  interface Printer {
    hostname: string;
    ip: string;
    status: string;
    extruder_temperature: number;
  }
  
  export default defineComponent({
    name: 'PrinterList',
    setup() {
      const printers = ref<Printer[]>([]);
  
      const fetchPrinters = async () => {
        try {
          const response = await fetch('/api/devices');
          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }
          printers.value = await response.json();
        } catch (error) {
          console.error('Failed to fetch devices:', error);
        }
      };
  
      onMounted(fetchPrinters);
  
      return { printers };
    },
  });
  </script>
  
  <style scoped>
  .printer-list {
    padding: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f4f4f4;
    font-weight: bold;
  }
  </style>