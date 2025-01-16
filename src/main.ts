import { createApp } from 'vue';

// Vuetify
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css'

// Components
import App from './App.vue';

// Vuetify with theme colors
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        colors: {
            primary: '#6200EE',
            secondary: '#03DAC6',
            background: '#FFFFFF',
            surface: '#F5F5F5',
            text: '#000000',
            accent: '#FF4081',
            error: '#B00020',
        },
      },
      dark: {
        colors: {
            primary: '#BB86FC', // Bright purple for primary actions
            secondary: '#03DAC6', // Cyan for secondary actions
            background: '#121212', // Dark background
            surface: '#1E1E1E', // Slightly lighter dark for surfaces
            text: '#E0E0E0', // Light gray for text
            accent: '#FF4081', // Pink for highlights or interactive elements
            error: '#CF6679', // Soft red for errors
        },
      },
    },
  },
});

createApp(App).use(vuetify).mount('#app');
