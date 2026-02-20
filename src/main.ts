import { createApp } from 'vue'
import './style.css'

// Vue Router
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// Root component
import App from './App.vue'

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
          primary: '#FFDF00',
          secondary: '#03DAC6',
          background: '#000000',
          surface: '#212429',
          text: '#E0E0E0',
          accent: '#FF4081',
          error: '#CF6679',
        },
      },
    },
  },
})

createApp(App)
  .use(router)     // ✅ THIS WAS MISSING
  .use(vuetify)
  .mount('#app')
