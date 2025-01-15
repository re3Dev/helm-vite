<template>
  <v-app>
<v-main>
 <PrinterList />
</v-main>
</v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import PrinterList from './components/PrinterList.vue';


export default defineComponent({
  name: 'App',
  components: { PrinterList },
});
</script>