import { createApp } from 'vue'

// Vue Router
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'

// i18n
import i18n from './i18n'

// Root component
import App from './App.vue'

// Vuetify with theme colors
const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    VCard: { elevation: 0 },
    VBtn: { elevation: 0 },
    VTextField: { variant: 'outlined', color: 'primary' },
    VTextarea: { variant: 'outlined', color: 'primary' },
    VSelect: { variant: 'outlined', color: 'primary' },
    VAutocomplete: { variant: 'outlined', color: 'primary' },
    VFileInput: { variant: 'outlined', color: 'primary' },
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      light: {
        colors: {
          primary: '#6200EE',
          secondary: '#03DAC6',
          background: '#FFFFFF',
          surface: '#F5F5F5',
          'surface-nav': '#EEEEEE',
          'surface-raised': '#E4E4E4',
          'surface-hover': '#D7DAE0',
          border: '#BCBEC0',
          'border-strong': '#999DA6',
          muted: '#494D54',
          text: '#000000',
          accent: '#FF4081',
          error: '#B00020',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#FFD400',
          'on-primary': '#181B20',
          secondary: '#BCBEC0',
          background: '#121314',
          surface: '#181B20',
          'surface-nav': '#14171B',
          'surface-raised': '#23272C',
          'surface-hover': '#393B3E',
          border: '#32353A',
          'border-strong': '#494D54',
          'on-background': '#F2F2F2',
          'on-surface': '#F2F2F2',
          muted: '#BCBEC0',
          text: '#F2F2F2',
          accent: '#FFD400',
          success: '#22C55E',
          warning: '#F97316',
          error: '#EF4444',
        },
      },
    },
  },
})

createApp(App)
  .use(router)
  .use(vuetify)
  .use(i18n)
  .mount('#app')
