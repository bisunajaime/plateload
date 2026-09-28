import {
  BARS,
  COLLARS,
  barById,
  barWeight,
  defaultBarId,
  defaultCollarKind,
  defaultInventory,
  getPlateSet,
  type Brand,
  type CollarKind,
  type EleikoStyle,
  type PlateDef,
  type Unit,
} from '../data/plates'
import { denomsFromPlates, snapToLoadable, type Denom, type RankMode, type SolveInput } from './combinations'
import { convert } from './format'

/** Where the floating load preview parks: which edge, and how far down (0–1). */
export interface PreviewPos {
  side: 'left' | 'right'
  y: number
}

export interface Favorite {
  label: string
  weight: number
  unit: Unit
}

/** A recent weight is meaningless without the unit it was entered in. */
export interface RecentWeight {
  weight: number
  unit: Unit
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  unit: Unit
  brand: Brand
  plateStyle: EleikoStyle
  barId: string
  customBarWeight: number | null
  collars: boolean
  collarKind: CollarKind
  /** null → use the collar kind's published weight. */
  collarWeight: number | null
  /** Bumpers-only when false. */
  includeChange: boolean
  /** Whole-gym counts keyed by plate id, across every brand/unit. */
  inventory: Record<string, number>
  gymMode: boolean
  preview: PreviewPos
  showLabels: boolean
  closeUp: boolean
  target: number
  mode: RankMode
  lastWeights: RecentWeight[]
  favorites: Favorite[]
}

export const STORAGE_KEY = 'plateload.v1'

export const RANK_MODES: RankMode[] = ['recommended', 'competition', 'fewest', 'compact', 'inventory', 'all']
const THEMES: Settings['theme'][] = ['light', 'dark', 'system']
const PLATE_STYLES: EleikoStyle[] = ['bumper', 'calibrated-steel', 'auto']

/** Heaviest target the app accepts — well past any world record. */
export const MAX_TARGET = 2000

const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
const oneOf = <T,>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)

export function defaultSettings(): Settings {
  const brand: Brand = 'metcon'
  const unit: Unit = 'lb'
  return {
    theme: 'system',
    unit,
    brand,
    plateStyle: 'bumper',
    barId: defaultBarId(brand, unit),
    customBarWeight: null,
    collars: true,
    collarKind: defaultCollarKind(brand),
    collarWeight: null,
    includeChange: true,
    inventory: {
      ...defaultInventory('eleiko', 'kg'),
      ...defaultInventory('eleiko', 'lb'),
      ...defaultInventory('metcon', 'kg'),
      ...defaultInventory('metcon', 'lb'),
    },
    gymMode: false,
    preview: { side: 'right', y: 0.08 },
    showLabels: false,
    closeUp: true,
    target: 100,
    mode: 'recommended',
    lastWeights: [],
    favorites: [],
  }
}

/** Merge stored settings over defaults, dropping anything malformed. */
export function hydrate(raw: unknown): Settings {
  const base = defaultSettings()
  if (!raw || typeof raw !== 'object') return base
  const s = raw as Partial<Settings>
  // Stored settings are untrusted: an old build or a hand edit can leave a
  // value the app would crash on (an unknown collar kind threw on every load).
  const brand = oneOf<Brand>(s.brand, ['eleiko', 'metcon'], base.brand)
  const unit = oneOf<Unit>(s.unit, ['kg', 'lb'], unitForBrand(brand))
  const inventory: Record<string, number> = { ...base.inventory }
  if (s.inventory && typeof s.inventory === 'object') {
    for (const [id, n] of Object.entries(s.inventory)) {
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) inventory[id] = Math.min(99, Math.round(n))
    }
  }
  const merged: Settings = {
    ...base,
    ...s,
    brand,
    unit,
    theme: oneOf(s.theme, THEMES, base.theme),
    plateStyle: oneOf(s.plateStyle, PLATE_STYLES, base.plateStyle),
    collarKind: s.collarKind && s.collarKind in COLLARS ? s.collarKind : defaultCollarKind(brand),
    collarWeight: typeof s.collarWeight === 'number' && Number.isFinite(s.collarWeight) && s.collarWeight >= 0 ? s.collarWeight : null,
    customBarWeight: positive(s.customBarWeight) ? s.customBarWeight : null,
    mode: oneOf(s.mode, RANK_MODES, base.mode),
    collars: typeof s.collars === 'boolean' ? s.collars : base.collars,
    includeChange: typeof s.includeChange === 'boolean' ? s.includeChange : base.includeChange,
    gymMode: typeof s.gymMode === 'boolean' ? s.gymMode : base.gymMode,
    showLabels: typeof s.showLabels === 'boolean' ? s.showLabels : base.showLabels,
    closeUp: typeof s.closeUp === 'boolean' ? s.closeUp : base.closeUp,
    inventory,
    favorites: Array.isArray(s.favorites)
      ? s.favorites
          .filter((f) => f && positive(f.weight) && (f.unit === 'kg' || f.unit === 'lb'))
          .map((f) => ({ label: typeof f.label === 'string' ? f.label : '', weight: f.weight, unit: f.unit }))
      : [],
    lastWeights: hydrateRecents(s.lastWeights, unit),
  }
  const pos = s.preview
  merged.preview =
    pos && (pos.side === 'left' || pos.side === 'right') && typeof pos.y === 'number' && pos.y >= 0 && pos.y <= 1
      ? { side: pos.side, y: pos.y }
      : base.preview
  if (!BARS.some((b) => b.id === merged.barId)) merged.barId = defaultBarId(merged.brand, merged.unit)
  if (!positive(merged.target) || merged.target > MAX_TARGET) merged.target = base.target
  // Old stores (and hand-edited ones) may hold a unit the brand does not use.
  if (merged.unit !== unitForBrand(merged.brand)) return applyBrand(merged, merged.brand)
  return merged
}

/** Accepts the old `number[]` shape and tags those entries with the stored unit. */
function hydrateRecents(raw: unknown, storedUnit: Unit): RecentWeight[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((r) =>
      typeof r === 'number'
        ? { weight: r, unit: storedUnit }
        : r && positive((r as RecentWeight).weight) && ((r as RecentWeight).unit === 'kg' || (r as RecentWeight).unit === 'lb')
          ? { weight: (r as RecentWeight).weight, unit: (r as RecentWeight).unit }
          : null,
    )
    .filter((r): r is RecentWeight => r !== null && r.weight > 0)
    .slice(0, 15)
}

/* -------------------------------------------------------------- resolution */

export interface Loadout {
  plates: PlateDef[]
  denoms: Denom[]
  bar: ReturnType<typeof barById>
  barWeight: number
  collarWeight: number
  collarWidthMm: number
  sleeveMm: number
  base: number
}

export function collarWeightOf(s: Pick<Settings, 'collarKind' | 'collarWeight' | 'unit'>): number {
  if (s.collarWeight != null && Number.isFinite(s.collarWeight)) return s.collarWeight
  const def = COLLARS[s.collarKind] ?? COLLARS.generic
  return s.unit === 'kg' ? def.kg : def.lb
}

export function resolveLoadout(s: Settings): Loadout {
  const plates = getPlateSet({
    brand: s.brand,
    unit: s.unit,
    // Metcon is drawn as its colour line; the black skin stays in the data layer only.
    metconStyle: 'colored',
    eleikoStyle: s.plateStyle,
  })
  const denoms = denomsFromPlates(plates, s.inventory, s.includeChange)
  const bar = barById(s.barId)
  const bw = barWeight(bar, s.unit, s.customBarWeight)
  const cw = collarWeightOf(s)
  const collarWidthMm = (COLLARS[s.collarKind] ?? COLLARS.generic).widthMm
  return {
    plates,
    denoms,
    bar,
    barWeight: bw,
    collarWeight: cw,
    collarWidthMm,
    sleeveMm: bar.sleeveMm,
    base: bw + (s.collars ? cw * 2 : 0),
  }
}

export function buildSolveInput(s: Settings, target = s.target, limit = 80): SolveInput {
  const l = resolveLoadout(s)
  return {
    target,
    unit: s.unit,
    bar: l.barWeight,
    collarsOn: s.collars,
    collarWeight: l.collarWeight,
    collarWidthMm: l.collarWidthMm,
    denoms: l.denoms,
    sleeveMm: l.sleeveMm,
    limit,
  }
}

/**
 * A brand fixes its unit: Eleiko is a kilo brand, Metcon is sold in pounds.
 * The unit is therefore never chosen on its own — picking a brand picks it.
 */
export const unitForBrand = (brand: Brand): Unit => (brand === 'metcon' ? 'lb' : 'kg')

export const brandForUnit = (unit: Unit): Brand => (unit === 'lb' ? 'metcon' : 'eleiko')

/**
 * Switch brand: adopt its unit, reset the bar and collars to that brand's
 * defaults, and carry the target across as the same real load.
 */
export function applyBrand(s: Settings, brand: Brand): Settings {
  const unit = unitForBrand(brand)
  const next: Settings = {
    ...s,
    brand,
    unit,
    // The bar resets — an Eleiko 20 kg and a US 45 lb bar are not the same bar.
    barId: defaultBarId(brand, unit),
    customBarWeight: null,
    collarKind: defaultCollarKind(brand),
    collarWeight: null,
    collars: true,
    // 100 kg becomes 220.5 lb, not 100 lb.
    target: s.unit === unit ? s.target : roundHalf(convert(s.target, s.unit, unit)),
    inventory: { ...defaultInventory(brand, unit), ...s.inventory },
  }
  if (s.unit === unit) return next
  // A straight conversion lands on half-pounds no gym can load; settle on the
  // nearest weight the new brand's plates can actually make.
  return { ...next, target: snapToLoadable(buildSolveInput(next), next.target) }
}

const roundHalf = (n: number) => Math.round(n * 2) / 2
