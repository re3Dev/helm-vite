import { createRouter, createWebHistory } from 'vue-router'
import PrinterList from './components/PrinterList.vue'
import Analytics from './components/Analytics.vue'

const routes = [
  // Make the default route show printers
  { path: '/', redirect: '/printers' },

  { path: '/printers', component: PrinterList },
  { path: '/analytics', component: Analytics },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
