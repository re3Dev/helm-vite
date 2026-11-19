export const CARD_SECTION_TYPES = ['job', 'progress', 'temperatures', 'preview', 'webcam'] as const
export type CardSectionType = typeof CARD_SECTION_TYPES[number]
export type CardSection = { type: CardSectionType; enabled: boolean; display: 'compact' | 'expanded' }
export type CustomCardLayout = { id: string; name: string; sections: CardSection[] }
export type CardTemperature = {
  label: string
  icon: string
  current: number
  target: number | null
  state: 'off' | 'on' | 'heating' | 'cooling' | 'unknown'
  progress: number
}
export type CustomCardData = {
  baseUrl: string
  uiUrl: string
  printing: boolean
  ready: boolean
  filename: string
  progress: number
  temperatures: CardTemperature[]
}

export function defaultCardSections(): CardSection[] {
  return CARD_SECTION_TYPES.map(type => ({
    type,
    enabled: type === 'job' || type === 'progress' || type === 'temperatures',
    display: 'compact',
  }))
}

export function copyCardLayout(layout: CustomCardLayout): CustomCardLayout {
  return { ...layout, sections: layout.sections.map(section => ({ ...section })) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCardSection(value: unknown): value is CardSection {
  return isRecord(value) && CARD_SECTION_TYPES.some(type => type === value.type) &&
    typeof value.enabled === 'boolean' && (value.display === 'compact' || value.display === 'expanded')
}

function isCustomCardLayout(value: unknown): value is CustomCardLayout {
  return isRecord(value) && typeof value.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(value.id) &&
    typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 60 &&
    Array.isArray(value.sections) && value.sections.length === CARD_SECTION_TYPES.length &&
    value.sections.every(isCardSection) && new Set(value.sections.map(section => section.type)).size === CARD_SECTION_TYPES.length
}

export function parseCustomCardLayouts(raw: string | null): CustomCardLayout[] {
  if (raw === null) return []
  const data: unknown = JSON.parse(raw)
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.layouts) || !data.layouts.every(isCustomCardLayout)) {
    throw new Error('Invalid custom card layouts')
  }
  const layouts = data.layouts
  if (new Set(layouts.map(layout => layout.id)).size !== layouts.length ||
    new Set(layouts.map(layout => layout.name.trim().toLocaleLowerCase())).size !== layouts.length) {
    throw new Error('Duplicate custom card layouts')
  }
  return layouts.map(layout => copyCardLayout({ ...layout, name: layout.name.trim() }))
}
