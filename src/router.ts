import { createRouter, createWebHistory } from 'vue-router';
import PrinterList from './components/PrinterList.vue';
import Dashboard from './layouts/DashboardLayout.vue';
import Analytics from './components/Analytics.vue';

const routes = [
  { path: '/', component: Dashboard },
  { path: '/printers', component: PrinterList },
  { path: '/analytics', component: Analytics },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
