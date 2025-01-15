import { createApp } from 'vue';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

// Components
import App from './App.vue';

// Vuetify with theme colors
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#1976D2', // Blue
          secondary: '#424242', // Grey
          accent: '#82B1FF', // Light Blue
          error: '#FF5252', // Red
          info: '#2196F3', // Light Blue
          success: '#4CAF50', // Green
          warning: '#FFC107', // Yellow
        },
      },
      dark: {
        colors: {
          primary: '#1E88E5',
          secondary: '#616161',
          accent: '#FF4081',
          error: '#F44336',
          info: '#64B5F6',
          success: '#81C784',
          warning: '#FFD54F',
        },
      },
    },
  },
});

createApp(App).use(vuetify).mount('#app');
