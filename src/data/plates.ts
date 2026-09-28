/**
 * PlateLoad — single source of truth for plates, bars, collars and inventory presets.
 *
 * Every real-world constant lives here. Nothing in the SVG layer may invent a
 * diameter, a thickness or a colour.
 *
 * Metcon specs are taken from the official product pages (verified 2026-08):
 *   https://metcongroupph.com/products/metcon-colored-bumper-plates-lbs
 *   https://metcongroupph.com/products/metcon-colored-bumper-plates-lbs-battleground-used-item
 *   https://metcongroupph.com/products/metcon-black-bumper-plates-lbs
 *   https://metcongroupph.com/products/metcon-bumper-plates-kg
 */

export type Unit = 'kg' | 'lb'
export type Brand = 'eleiko' | 'metcon'
export type MetconStyle = 'colored' | 'black'
export type EleikoStyle = 'bumper' | 'calibrated-steel' | 'auto'
export type PlateKind = 'bumper' | 'change' | 'fractional'
export type PlateFamily = 'eleiko-bumper' | 'eleiko-steel' | 'metcon-bumper' | 'metcon-change'
export type Finish = 'rubber' | 'steel' | 'chrome'

export interface PlateDef {
  /** Stable across skins (colour/black) so inventory survives a style switch. */
  id: string
  brand: Brand
  unit: Unit
  weight: number
  /** Face colour, resolved for the active skin. */
  color: string
  /** Ink that reads on `color`. */
  textColor: string
  diameterMm: number
  thicknessMm: number
  insertMm: number
  kind: PlateKind
  label: string
  finish: Finish
  family: PlateFamily
}

/* ------------------------------------------------------------------ colours */

export const IWF = {
  red: '#C8102E',
  blue: '#0033A0',
  yellow: '#FFD100',
  green: '#007A33',
  white: '#F5F5F5',
  black: '#1B1B1D',
  chrome: '#B9BFC6',
} as const

/** Relative luminance → pick black or white lettering. */
export function inkOn(hex: string): string {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return L > 0.45 ? '#141416' : '#FFFFFF'
}

/* ----------------------------------------------------------- Metcon (spec) */

/** Shared construction of every Metcon bumper, colour or black, kg or lb. */
export const METCON_BUMPER = {
  diameterMm: 450,
  insertMm: 50.4,
  hardnessShoreA: 90,
  centerTorsionN: 2000,
  finish: 'gloss-matte-gloss',
} as const

/** Official widths. 10 lb = the 24 mm figure in the shared spec block; 15 lb interpolated. */
/** Face colours read off the Metcon product photography, not the IWF kg code. */
export const METCON_LB_COLORS = {
  grey: '#9AA0A5',
  black: '#17181A',
  green: '#1E8A3C',
  yellow: '#F4C400',
  blue: '#1D5CA8',
  red: '#C8102E',
} as const

export const METCON_COLORED_LB = [
  { weight: 10, thicknessMm: 24, color: METCON_LB_COLORS.grey },
  // 15 lb is black in the coloured line; its width is not published, so it is
  // interpolated between the 10 lb and 25 lb figures.
  { weight: 15, thicknessMm: 30, color: METCON_LB_COLORS.black },
  { weight: 25, thicknessMm: 36, color: METCON_LB_COLORS.green },
  { weight: 35, thicknessMm: 52, color: METCON_LB_COLORS.yellow },
  { weight: 45, thicknessMm: 63, color: METCON_LB_COLORS.blue },
  { weight: 55, thicknessMm: 73, color: METCON_LB_COLORS.red },
] as const

export const METCON_BLACK_KG = [
  { weight: 5, thicknessMm: 24 },
  { weight: 10, thicknessMm: 36 },
  { weight: 15, thicknessMm: 52 },
  { weight: 20, thicknessMm: 63 },
  { weight: 25, thicknessMm: 73 },
] as const

/**
 * Metcon's small plates: 5 lb and 2.5 lb, both black. Widths are not published,
 * so the geometry is typical for a change plate of that weight.
 */
const METCON_CHANGE_LB = [
  { weight: 5, diameterMm: 225, thicknessMm: 20 },
  { weight: 2.5, diameterMm: 190, thicknessMm: 16 },
] as const

const METCON_CHANGE_KG = [
  { weight: 2.5, diameterMm: 190, thicknessMm: 16 },
  { weight: 1.25, diameterMm: 160, thicknessMm: 13 },
  { weight: 0.5, diameterMm: 130, thicknessMm: 10 },
] as const

const METCON_BLACK_FACE = '#17181A'
/** Optional “coloured kg” skin: same geometry, IWF paint. */
const METCON_KG_IWF: Record<number, string> = {
  25: IWF.red,
  20: IWF.blue,
  15: IWF.yellow,
  10: IWF.green,
  5: IWF.white,
}

/* ----------------------------------------------------------- Eleiko (spec) */

/** Eleiko / IWF competition weightlifting discs — full-diameter bumpers 10–25 kg. */
const ELEIKO_BUMPER_KG = [
  { weight: 25, diameterMm: 450, thicknessMm: 67, color: IWF.red },
  { weight: 20, diameterMm: 450, thicknessMm: 54, color: IWF.blue },
  { weight: 15, diameterMm: 450, thicknessMm: 43, color: IWF.yellow },
  { weight: 10, diameterMm: 450, thicknessMm: 32, color: IWF.green },
] as const

/** Competition change plates (also the training-hall 5 / 2.5). */
const ELEIKO_CHANGE_KG = [
  { weight: 5, diameterMm: 350, thicknessMm: 26, color: IWF.white, kind: 'change' as const },
  { weight: 2.5, diameterMm: 270, thicknessMm: 22, color: IWF.red, kind: 'change' as const },
  { weight: 2, diameterMm: 190, thicknessMm: 20, color: IWF.blue, kind: 'change' as const },
  { weight: 1.5, diameterMm: 175, thicknessMm: 18, color: IWF.yellow, kind: 'change' as const },
  { weight: 1, diameterMm: 160, thicknessMm: 16, color: IWF.green, kind: 'change' as const },
  { weight: 0.5, diameterMm: 140, thicknessMm: 13, color: IWF.white, kind: 'change' as const },
  { weight: 0.25, diameterMm: 120, thicknessMm: 11, color: IWF.black, kind: 'fractional' as const },
] as const

/** Eleiko IPF calibrated steel — diameter scales with weight, discs are thin. */
const ELEIKO_STEEL_KG = [
  { weight: 25, diameterMm: 450, thicknessMm: 30, color: IWF.red },
  { weight: 20, diameterMm: 400, thicknessMm: 27, color: IWF.blue },
  { weight: 15, diameterMm: 350, thicknessMm: 24, color: IWF.yellow },
  { weight: 10, diameterMm: 325, thicknessMm: 22, color: IWF.green },
  { weight: 5, diameterMm: 228, thicknessMm: 19, color: IWF.white },
  { weight: 2.5, diameterMm: 190, thicknessMm: 16, color: IWF.red },
  { weight: 2, diameterMm: 175, thicknessMm: 14, color: IWF.blue },
  { weight: 1.5, diameterMm: 165, thicknessMm: 12, color: IWF.yellow },
  { weight: 1, diameterMm: 150, thicknessMm: 11, color: IWF.green },
  { weight: 0.5, diameterMm: 130, thicknessMm: 9, color: IWF.white },
  { weight: 0.25, diameterMm: 110, thicknessMm: 7, color: IWF.black },
] as const

/** Eleiko lb training set. */
const ELEIKO_LB = [
  { weight: 45, diameterMm: 450, thicknessMm: 62, color: IWF.blue, kind: 'bumper' as const, finish: 'rubber' as const },
  { weight: 35, diameterMm: 450, thicknessMm: 48, color: IWF.yellow, kind: 'bumper' as const, finish: 'rubber' as const },
  { weight: 25, diameterMm: 450, thicknessMm: 36, color: IWF.green, kind: 'bumper' as const, finish: 'rubber' as const },
  { weight: 10, diameterMm: 450, thicknessMm: 25, color: IWF.white, kind: 'bumper' as const, finish: 'rubber' as const },
  { weight: 5, diameterMm: 230, thicknessMm: 22, color: IWF.chrome, kind: 'change' as const, finish: 'steel' as const },
  { weight: 2.5, diameterMm: 195, thicknessMm: 18, color: IWF.chrome, kind: 'change' as const, finish: 'steel' as const },
  { weight: 1.25, diameterMm: 165, thicknessMm: 14, color: IWF.chrome, kind: 'fractional' as const, finish: 'steel' as const },
] as const

const ELEIKO_INSERT_MM = 50.4

/* --------------------------------------------------------------- plate ids */

const fmtId = (n: number) => String(n).replace(/\.0+$/, '')
export const plateId = (brand: Brand, unit: Unit, weight: number) => `${brand}-${unit}-${fmtId(weight)}`

export interface PlateSetOptions {
  brand: Brand
  unit: Unit
  metconStyle?: MetconStyle
  eleikoStyle?: EleikoStyle
}

function mk(p: Omit<PlateDef, 'textColor' | 'id' | 'label'> & { id?: string; label?: string }): PlateDef {
  return {
    ...p,
    id: p.id ?? plateId(p.brand, p.unit, p.weight),
    label: p.label ?? `${fmtId(p.weight)} ${p.unit}`,
    textColor: inkOn(p.color),
  }
}

/**
 * All denominations for a brand/unit/skin, heaviest first.
 * Plate ids never change with the skin, so inventory survives a style toggle.
 */
export function getPlateSet(o: PlateSetOptions): PlateDef[] {
  const { brand, unit } = o
  if (brand === 'metcon') {
    if (unit === 'lb') {
      const black = o.metconStyle === 'black'
      const bumpers = METCON_COLORED_LB.map((p) =>
        mk({
          brand,
          unit,
          weight: p.weight,
          color: black ? METCON_BLACK_FACE : p.color,
          diameterMm: METCON_BUMPER.diameterMm,
          thicknessMm: p.thicknessMm,
          insertMm: METCON_BUMPER.insertMm,
          kind: 'bumper',
          finish: 'rubber',
          family: 'metcon-bumper',
        }),
      )
      const change = METCON_CHANGE_LB.map((p) =>
        mk({
          brand,
          unit,
          weight: p.weight,
          color: METCON_BLACK_FACE,
          diameterMm: p.diameterMm,
          thicknessMm: p.thicknessMm,
          insertMm: METCON_BUMPER.insertMm,
          kind: 'change',
          finish: 'steel',
          family: 'metcon-change',
        }),
      )
      return [...bumpers, ...change].sort((a, b) => b.weight - a.weight)
    }
    const colored = o.metconStyle === 'colored'
    const bumpers = METCON_BLACK_KG.map((p) =>
      mk({
        brand,
        unit,
        weight: p.weight,
        color: colored ? METCON_KG_IWF[p.weight] ?? METCON_BLACK_FACE : METCON_BLACK_FACE,
        diameterMm: METCON_BUMPER.diameterMm,
        thicknessMm: p.thicknessMm,
        insertMm: METCON_BUMPER.insertMm,
        kind: 'bumper',
        finish: 'rubber',
        family: 'metcon-bumper',
      }),
    )
    const change = METCON_CHANGE_KG.map((p) =>
      mk({
        brand,
        unit,
        weight: p.weight,
        color: IWF.chrome,
        diameterMm: p.diameterMm,
        thicknessMm: p.thicknessMm,
        insertMm: METCON_BUMPER.insertMm,
        kind: p.weight >= 1.25 ? 'change' : 'fractional',
        finish: 'steel',
        family: 'metcon-change',
      }),
    )
    return [...bumpers, ...change].sort((a, b) => b.weight - a.weight)
  }

  // Eleiko
  if (unit === 'lb') {
    return ELEIKO_LB.map((p) =>
      mk({
        brand,
        unit,
        weight: p.weight,
        color: p.color,
        diameterMm: p.diameterMm,
        thicknessMm: p.thicknessMm,
        insertMm: ELEIKO_INSERT_MM,
        kind: p.kind,
        finish: p.finish,
        family: p.finish === 'steel' ? 'eleiko-steel' : 'eleiko-bumper',
      }),
    ).sort((a, b) => b.weight - a.weight)
  }

  if (o.eleikoStyle === 'calibrated-steel') {
    return ELEIKO_STEEL_KG.map((p) =>
      mk({
        brand,
        unit,
        weight: p.weight,
        color: p.color,
        diameterMm: p.diameterMm,
        thicknessMm: p.thicknessMm,
        insertMm: ELEIKO_INSERT_MM,
        kind: p.weight >= 5 ? 'bumper' : p.weight >= 1 ? 'change' : 'fractional',
        finish: 'steel',
        family: 'eleiko-steel',
      }),
    )
  }

  const bumpers = ELEIKO_BUMPER_KG.map((p) =>
    mk({
      brand,
      unit,
      weight: p.weight,
      color: p.color,
      diameterMm: p.diameterMm,
      thicknessMm: p.thicknessMm,
      insertMm: ELEIKO_INSERT_MM,
      kind: 'bumper',
      finish: 'rubber',
      family: 'eleiko-bumper',
    }),
  )
  const change = ELEIKO_CHANGE_KG.map((p) =>
    mk({
      brand,
      unit,
      weight: p.weight,
      color: p.color,
      diameterMm: p.diameterMm,
      thicknessMm: p.thicknessMm,
      insertMm: ELEIKO_INSERT_MM,
      kind: p.kind,
      finish: p.weight >= 2.5 ? 'rubber' : p.weight >= 0.5 ? 'rubber' : 'steel',
      family: 'eleiko-bumper',
    }),
  )
  return [...bumpers, ...change]
}

/* -------------------------------------------------------------------- bars */

export interface BarDef {
  id: string
  label: string
  short: string
  kg: number
  lb: number
  brand: Brand | null
  lengthMm: number
  shaftMm: number
  /** Loadable sleeve length, mm. */
  sleeveMm: number
  ringColor: string
  centerKnurl: boolean
  note?: string
  custom?: boolean
}

export const BARS: BarDef[] = [
  {
    id: 'oly-men-20',
    label: "Men's Olympic — 20 kg",
    short: "Men's 20 kg",
    kg: 20,
    lb: 44.09,
    brand: 'eleiko',
    lengthMm: 2200,
    shaftMm: 28,
    sleeveMm: 415,
    ringColor: IWF.blue,
    centerKnurl: true,
    note: '220 cm · 28 mm shaft · IWF markings',
  },
  {
    id: 'oly-women-15',
    label: "Women's Olympic — 15 kg",
    short: "Women's 15 kg",
    kg: 15,
    lb: 33.07,
    brand: 'eleiko',
    lengthMm: 2010,
    shaftMm: 25,
    sleeveMm: 400,
    ringColor: IWF.yellow,
    centerKnurl: false,
    note: '201 cm · 25 mm shaft · no centre knurl',
  },
  {
    id: 'technique-10',
    label: 'Technique / youth — 10 kg',
    short: 'Technique 10 kg',
    kg: 10,
    lb: 22.05,
    brand: null,
    lengthMm: 1800,
    shaftMm: 25,
    sleeveMm: 330,
    ringColor: '#9AA0A6',
    centerKnurl: false,
    note: 'Light training bar',
  },
  {
    id: 'us-45',
    label: 'Standard US barbell — 45 lb',
    short: 'US 45 lb',
    kg: 20.41,
    lb: 45,
    brand: null,
    lengthMm: 2200,
    shaftMm: 28.5,
    sleeveMm: 415,
    ringColor: '#9AA0A6',
    centerKnurl: true,
    note: '45 lb power bar',
  },
  {
    id: 'metcon-men-20',
    label: "Metcon Olympic Men's — 20 kg",
    short: 'Metcon 20 kg',
    kg: 20,
    lb: 44.09,
    brand: 'metcon',
    lengthMm: 2200,
    shaftMm: 28,
    sleeveMm: 415,
    ringColor: '#C7CBD1',
    centerKnurl: true,
    note: '220 cm · 28 mm grip · spring steel · hard chrome · 8 needle bearings · 1500 lb capacity',
  },
  {
    id: 'metcon-women-15',
    label: "Metcon Olympic Women's — 15 kg",
    short: 'Metcon 15 kg',
    kg: 15,
    lb: 33.07,
    brand: 'metcon',
    lengthMm: 2000,
    shaftMm: 25,
    sleeveMm: 400,
    ringColor: '#C7CBD1',
    centerKnurl: false,
    note: '200 cm · 25 mm grip · hard chrome · 1300 lb capacity',
  },
  {
    id: 'trap-25',
    label: 'Trap / hex — 25 kg',
    short: 'Trap 25 kg',
    kg: 25,
    lb: 55,
    brand: null,
    lengthMm: 1400,
    shaftMm: 32,
    sleeveMm: 380,
    ringColor: '#9AA0A6',
    centerKnurl: false,
    note: 'Optional',
  },
  {
    id: 'custom',
    label: 'Custom bar',
    short: 'Custom',
    // Until a weight is typed, the standard bar of each unit — 20 kg, 45 lb.
    // Not 20 kg converted: 44.09 lb put every total on a .09 fraction.
    kg: 20,
    lb: 45,
    brand: null,
    lengthMm: 2200,
    shaftMm: 28,
    sleeveMm: 415,
    ringColor: '#9AA0A6',
    centerKnurl: true,
    custom: true,
  },
]

export const barById = (id: string): BarDef => BARS.find((b) => b.id === id) ?? BARS[0]

export function defaultBarId(brand: Brand, unit: Unit): string {
  if (brand === 'metcon') return unit === 'lb' ? 'us-45' : 'metcon-men-20'
  return unit === 'lb' ? 'us-45' : 'oly-men-20'
}

/** Bar weight in the requested unit, honouring a custom bar override. */
export function barWeight(bar: BarDef, unit: Unit, customWeight?: number | null): number {
  if (bar.custom && customWeight != null && Number.isFinite(customWeight)) return customWeight
  return unit === 'kg' ? bar.kg : bar.lb
}

/* ----------------------------------------------------------------- collars */

export type CollarKind = 'eleiko-competition' | 'metcon-fastclip' | 'generic'

export interface CollarDef {
  kind: CollarKind
  label: string
  /** Per collar (one side). */
  kg: number
  lb: number
  widthMm: number
  note: string
}

export const COLLARS: Record<CollarKind, CollarDef> = {
  'eleiko-competition': {
    kind: 'eleiko-competition',
    label: 'IWF competition collar',
    kg: 2.5,
    lb: 5.51,
    widthMm: 42,
    note: '2.5 kg each — 5 kg the pair',
  },
  'metcon-fastclip': {
    kind: 'metcon-fastclip',
    label: 'Metcon Fast Clip',
    kg: 0,
    lb: 0,
    widthMm: 22,
    note: 'Rubber spring clip — adds no weight',
  },
  generic: {
    kind: 'generic',
    label: 'Gym clip / lockjaw',
    kg: 0,
    lb: 0,
    widthMm: 26,
    note: 'Counts as 0 unless you set a weight',
  },
}

export function defaultCollarKind(brand: Brand): CollarKind {
  return brand === 'metcon' ? 'metcon-fastclip' : 'eleiko-competition'
}

/* ------------------------------------------------------- inventory presets */

export interface InventoryPreset {
  id: string
  label: string
  hint: string
  brand: Brand
  unit: Unit
  /** Whole-gym counts. Per side = floor(count / 2). */
  counts: Record<string, number>
}

const inv = (brand: Brand, unit: Unit, pairs: Record<number, number>): Record<string, number> =>
  Object.fromEntries(Object.entries(pairs).map(([w, c]) => [plateId(brand, unit, Number(w)), c]))

export const PRESETS: InventoryPreset[] = [
  {
    id: 'eleiko-competition',
    label: 'Eleiko competition platform',
    hint: 'Full IWF set incl. 0.25 kg change plates',
    brand: 'eleiko',
    unit: 'kg',
    counts: inv('eleiko', 'kg', {
      25: 8, 20: 4, 15: 4, 10: 4, 5: 4, 2.5: 4, 2: 4, 1.5: 4, 1: 4, 0.5: 4, 0.25: 4,
    }),
  },
  {
    id: 'eleiko-training',
    label: 'Eleiko training hall',
    hint: 'Bumpers plus 5 / 2.5 / 1.25-style change',
    brand: 'eleiko',
    unit: 'kg',
    counts: inv('eleiko', 'kg', { 25: 8, 20: 8, 15: 4, 10: 4, 5: 6, 2.5: 6, 2: 2, 1.5: 2, 1: 2, 0.5: 2, 0.25: 0 }),
  },
  {
    id: 'eleiko-lb',
    label: 'Eleiko lb training set',
    hint: '45 / 35 / 25 / 10 plus steel change',
    brand: 'eleiko',
    unit: 'lb',
    counts: inv('eleiko', 'lb', { 45: 8, 35: 4, 25: 4, 10: 4, 5: 4, 2.5: 4, 1.25: 4 }),
  },
  {
    id: 'metcon-colored-lb',
    label: 'Metcon coloured gym (lb)',
    hint: 'Well-stocked box, change plates on',
    brand: 'metcon',
    unit: 'lb',
    counts: inv('metcon', 'lb', { 55: 4, 45: 8, 35: 4, 25: 4, 15: 4, 10: 4, 5: 4, 2.5: 4 }),
  },
  {
    id: 'metcon-black-kg',
    label: 'Metcon black gym (kg)',
    hint: 'kg bumpers plus 2.5 / 1.25 change',
    brand: 'metcon',
    unit: 'kg',
    counts: inv('metcon', 'kg', { 25: 8, 20: 4, 15: 4, 10: 4, 5: 4, 2.5: 4, 1.25: 4, 0.5: 0 }),
  },
  {
    id: 'metcon-bumpers-lb',
    label: 'Metcon bumpers only (lb)',
    hint: 'Catalogue as sold — no change plates',
    brand: 'metcon',
    unit: 'lb',
    counts: inv('metcon', 'lb', { 55: 4, 45: 8, 35: 4, 25: 4, 15: 4, 10: 4, 5: 0, 2.5: 0 }),
  },
  {
    id: 'metcon-bumpers-kg',
    label: 'Metcon bumpers only (kg)',
    hint: 'Catalogue as sold — no change plates',
    brand: 'metcon',
    unit: 'kg',
    counts: inv('metcon', 'kg', { 25: 8, 20: 4, 15: 4, 10: 4, 5: 4, 2.5: 0, 1.25: 0, 0.5: 0 }),
  },
  {
    id: 'home-lb',
    label: 'Home gym (lb)',
    hint: 'Sparse — 45 × 4, 25 × 2, 10 × 2',
    brand: 'metcon',
    unit: 'lb',
    counts: inv('metcon', 'lb', { 55: 0, 45: 4, 35: 0, 25: 2, 15: 0, 10: 2, 5: 2, 2.5: 2 }),
  },
  {
    id: 'home-kg',
    label: 'Home gym (kg)',
    hint: 'Sparse — 20 × 4, 10 × 2, 5 × 2',
    brand: 'metcon',
    unit: 'kg',
    counts: inv('metcon', 'kg', { 25: 0, 20: 4, 15: 0, 10: 2, 5: 2, 2.5: 2, 1.25: 0, 0.5: 0 }),
  },
]

/** Preset that a fresh brand/unit combination should start from. */
export function defaultPresetFor(brand: Brand, unit: Unit): InventoryPreset {
  if (brand === 'metcon') return PRESETS.find((p) => p.id === (unit === 'lb' ? 'metcon-colored-lb' : 'metcon-black-kg'))!
  return PRESETS.find((p) => p.id === (unit === 'lb' ? 'eleiko-lb' : 'eleiko-competition'))!
}

/** Counts for a brand/unit, filling any denomination the preset omits with 0. */
export function defaultInventory(brand: Brand, unit: Unit): Record<string, number> {
  const set = getPlateSet({ brand, unit })
  const preset = defaultPresetFor(brand, unit)
  const out: Record<string, number> = {}
  for (const p of set) out[p.id] = preset.counts[p.id] ?? 0
  return out
}
