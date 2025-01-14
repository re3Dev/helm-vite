import { createRouter, createWebHistory } from 'vue-router';
import PrinterList from './components/PrinterList.vue';
import Dashboard from './layouts/DashboardLayout.vue';

const routes = [
  { path: '/', component: Dashboard },
  { path: '/printers', component: PrinterList },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
