<template>
  <div id="app">
    <PrinterList />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PrinterList from './components/PrinterList.vue';

export default defineComponent({
  name: 'App',
  components: { PrinterList },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 20px;
}
</style>