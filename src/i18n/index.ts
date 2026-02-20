import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

export type MessageSchema = typeof en

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
] as const

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code']

const savedLocale = (localStorage.getItem('helm-locale') as LocaleCode) ?? 'en'

const i18n = createI18n<[MessageSchema], LocaleCode>({
  legacy: false,          // use Composition API mode
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    fr,
  },
})

export default i18n
