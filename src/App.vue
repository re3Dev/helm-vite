<template>
  <!-- Single v-app at the root -->
  <v-app class="d-flex">
    <DefaultLayout />
  </v-app>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import DefaultLayout from './components/DefaultLayout.vue'

export default defineComponent({
  name: 'App',
  components: { DefaultLayout },
})
</script>

<style scoped></style>
