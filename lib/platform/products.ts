import type { EventConfig, EventProducts, ProductMode, WizardStepId } from './types.ts'
import { WIZARD_STEP_IDS } from './types.ts'

export const DEFAULT_PRODUCTS: EventProducts = {
  site: true,
  invitation: true,
  saveTheDate: true,
}

export const PRODUCT_IDS = ['site', 'invitation', 'saveTheDate'] as const

/** Steps that only make sense with a public event website (includes Look/branding). */
const SITE_STEP_IDS = new Set<WizardStepId>([
  'branding',
  'story',
  'schedule',
  'venues',
  'places',
  'media',
  'faq',
  'contact',
  'legal',
])

export function ensureAtLeastOneProduct(products: EventProducts): EventProducts {
  if (products.site || products.invitation || products.saveTheDate) return products
  return { ...products, invitation: true }
}

export function productModeFrom(products: EventProducts): ProductMode {
  return products.site ? 'site' : 'invite_only'
}

/** Resolve products from new field or legacy productMode / saveTheDate.enabled. */
export function normalizeProducts(
  raw: Partial<EventProducts> | undefined,
  productMode?: ProductMode | string | null,
  saveTheDateEnabled?: boolean,
): EventProducts {
  const hasExplicit =
    raw &&
    typeof raw === 'object' &&
    ('site' in raw || 'invitation' in raw || 'saveTheDate' in raw)

  if (hasExplicit) {
    return ensureAtLeastOneProduct({
      site: raw!.site === true,
      invitation: raw!.invitation === true,
      saveTheDate: raw!.saveTheDate === true,
    })
  }

  return ensureAtLeastOneProduct({
    site: productMode !== 'invite_only',
    invitation: true,
    saveTheDate: saveTheDateEnabled !== false,
  })
}

export function parseProductsInput(
  input:
    | Partial<EventProducts>
    | { site?: boolean; invitation?: boolean; saveTheDate?: boolean }
    | undefined
    | null,
  fallbackProductMode?: string,
): EventProducts {
  if (input && typeof input === 'object') {
    const anyOn =
      input.site === true || input.invitation === true || input.saveTheDate === true
    const anyKey = 'site' in input || 'invitation' in input || 'saveTheDate' in input
    if (anyKey) {
      if (!anyOn && fallbackProductMode === 'invite_only') {
        return normalizeProducts(undefined, 'invite_only', true)
      }
      if (!anyOn && fallbackProductMode === 'site') {
        return { ...DEFAULT_PRODUCTS }
      }
      return normalizeProducts(
        {
          site: !!input.site,
          invitation: !!input.invitation,
          saveTheDate: !!input.saveTheDate,
        },
        fallbackProductMode,
      )
    }
  }
  if (fallbackProductMode === 'invite_only') {
    return normalizeProducts(undefined, 'invite_only', true)
  }
  return { ...DEFAULT_PRODUCTS }
}

export function toggleProduct(products: EventProducts, id: keyof EventProducts): EventProducts {
  return ensureAtLeastOneProduct({ ...products, [id]: !products[id] })
}

export function wizardStepIdsForProducts(products: EventProducts): readonly WizardStepId[] {
  const p = ensureAtLeastOneProduct(products)
  const guestFlow = p.invitation || p.saveTheDate

  return WIZARD_STEP_IDS.filter((id) => {
    if (SITE_STEP_IDS.has(id)) return p.site
    if (id === 'saveTheDate') return p.saveTheDate
    if (id === 'invitation') return p.invitation
    if (id === 'rsvp') return p.site || p.invitation
    if (id === 'reminders' || id === 'guestsBootstrap') return guestFlow
    return true
  })
}

export function comingSoonMessageFor(locale: EventConfig['locales']['default']): string {
  if (locale === 'en') {
    return 'The event website will be available soon. Your invitation is on the way.'
  }
  if (locale === 'es') {
    return 'El sitio del evento estará disponible pronto. Tu invitación está en camino.'
  }
  if (locale === 'he') {
    return 'אתר האירוע יהיה זמין בקרוב. ההזמנה בדרך.'
  }
  return 'O site do evento estará disponível em breve. O convite segue por email.'
}

/** Apply product selection: sync productMode + saveTheDate.enabled + coming-soon when no site. */
export function applyProducts(config: EventConfig, next: EventProducts): EventConfig {
  const products = ensureAtLeastOneProduct(next)
  const productMode = productModeFrom(products)
  const base: EventConfig = {
    ...config,
    products,
    productMode,
    saveTheDate: {
      ...config.saveTheDate,
      enabled: products.saveTheDate,
    },
  }

  if (!products.site) {
    return {
      ...base,
      legal: {
        ...base.legal,
        comingSoon: true,
        comingSoonMessage:
          base.legal.comingSoonMessage || comingSoonMessageFor(base.locales.default),
      },
    }
  }

  return {
    ...base,
    legal: {
      ...base.legal,
      comingSoon: false,
    },
  }
}
