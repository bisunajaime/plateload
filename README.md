# PlateLoad

**Load any weight. See every combination.**

A mobile-first barbell plate calculator. Type a target, and PlateLoad subtracts the bar and
collars, then finds *every* symmetric way to load the remainder out of the plates your gym
actually owns — drawn as a real barbell in SVG, with brand-accurate Eleiko and Metcon geometry.

No backend, no accounts. Settings, inventory and recents live in `localStorage`; the app
installs as a PWA and works offline after the first load.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
npm test           # Vitest — combination engine, warm-ups, settings
npm run coverage   # tests with coverage
npm run lint       # oxlint
npm run typecheck  # tsc project build
```

Deploy `dist/` to any static host. The service worker is generated at build time by
`vite-plugin-pwa` (`registerType: 'autoUpdate'`).

---

## How the maths works

Loading is always symmetric, so the engine only ever solves for **one side**:

```
platesTotal = target − bar − (collarsOn ? collarWeight × 2 : 0)
perSide     = platesTotal / 2
```

All arithmetic runs on integer milli-units (1 kg = 1000, 1 lb = 1000) so `2.5 + 1.25` never
drifts, and the search then runs on a gcd-scaled grid — an Eleiko kg set collapses to steps of
0.25 kg, so the space stays tiny. `src/lib/combinations.ts`:

- `reachablePerSide()` — bounded-knapsack reachability, used for "is this loadable?",
  nearest-weight suggestions and the next-jump chips.
- `solve()` — depth-first search over denominations in descending order, pruned by suffix
  sums. Because counts are chosen per denomination in a fixed order, results are **unique**
  and stored **inside-out** (heaviest first — the order you actually load a bar).
- `rankCombos()` — the six ranking modes.

Typical solves take well under a millisecond; there is a test asserting < 50 ms on a dense set.

### Ranking modes

| Mode | Sorts by |
|---|---|
| **Recommended** | fits the sleeve → fewest plates → competition order → least change-plate clutter |
| **Competition** | largest plates innermost (lexicographic maximum — the platform-standard stack) |
| **Fewest** | plate count per side |
| **Compact** | shortest stack, using official plate widths plus the collar |
| **Use what I have** | spends the heaviest denominations first |
| **All** | everything, plate count ascending |

Exactly one combination carries the **Competition** badge: the lexicographic maximum, i.e. the
stack a platform loader would build.

### When nothing fits

The empty state is a teaching state: it names the nearest loadable weights above and below,
offers them as one-tap buttons, and — when change plates are switched off — offers to turn them
back on. This happens a lot with Metcon, whose catalogue is bumpers only.

---

## How inventory works

Counts are **whole-gym counts**: how many of that plate exist in the building. Because loading
is symmetric, the engine uses `floor(count / 2)` per side. Three 25s therefore give you one 25 a
side, not one and a half.

Open **Setup** (the gear) to edit counts, pick a preset, choose the bar and collars, and flip
the **change plates** switch. Presets ship for: Eleiko competition platform, Eleiko training
hall, Eleiko lb set, Metcon coloured gym (lb), Metcon black gym (kg), Metcon bumpers only (kg
and lb), and sparse home gyms.

Plate ids are stable across skins (`metcon-lb-45` is the same plate whether you view the black
or the coloured line), so switching styles never resets your inventory. Ids *are* unit-scoped,
so a brand change remaps to that system's plate set — a bar never mixes units.

### The brand owns the unit

Eleiko is a kilo brand, Metcon is sold in pounds, so the unit is not a separate choice:
picking the brand picks the unit, and the header shows it as a locked indicator rather than a
toggle (`unitForBrand()` in `src/lib/settings.ts`). Switching brand therefore:

- swaps the plate set (Eleiko kg ↔ Metcon lb) and the collars (2.5 kg competition ↔ 0 lb Fast Clip),
- **resets the bar** to that brand's default, discarding any custom bar weight,
- carries the target across as the same real load — 100 kg becomes 220.5 lb, then snaps to the
  nearest weight the new plates can actually make (220 lb), because a straight conversion lands
  on half-pounds no gym can load.

A stored or hand-edited setting whose unit contradicts its brand is repaired on load.

The Metcon kg bumper line and the Eleiko lb training set stay in `src/data/plates.ts` (and under
test) but are not reachable from the UI while this rule holds.

---

## Adding a plate denomination

Everything lives in `src/data/plates.ts` — the SVG layer is not allowed to invent a dimension.

1. Add the entry to the right table, with real numbers:

   ```ts
   export const METCON_COLORED_LB = [
     ...
     { weight: 65, thicknessMm: 82, color: '#8E0F22' },
   ] as const
   ```

2. It is picked up automatically by `getPlateSet()`, which builds `PlateDef`s (id, colour,
   diameter, thickness, insert, kind, family, ink colour).
3. Give it a starting count in the presets in the same file (`PRESETS`), and in
   `defaultInventory()` if it should be stocked by default.
4. Nothing else needs touching: the engine, the inventory editor and the SVG plates all read
   from the same definitions.

`kind` drives behaviour — `bumper` plates survive the bumpers-only toggle, `change` and
`fractional` do not. `family` drives the drawing: `metcon-bumper`, `eleiko-bumper` or a steel
disc.

---

## Plate data and where it comes from

### Metcon (source of truth)

Shared construction for every Metcon bumper, colour or black, kg or lb — 450 mm diameter,
50.4 mm collar, 90A shore, centre torsion > 2000 N, gloss–matte–gloss textured matte finish with
raised lettering:

- <https://metcongroupph.com/products/metcon-colored-bumper-plates-lbs>
- <https://metcongroupph.com/products/metcon-colored-bumper-plates-lbs-battleground-used-item>
- <https://metcongroupph.com/products/metcon-black-bumper-plates-lbs>
- <https://metcongroupph.com/products/metcon-bumper-plates-kg>

| lb | width | | kg | width |
|---|---|---|---|---|
| 10 | 24 mm | | 5 | 24 mm |
| 15 | 30 mm *(inferred)* | | 10 | 36 mm |
| 25 | 36 mm | | 15 | 52 mm |
| 35 | 52 mm | | 20 | 63 mm |
| 45 | 63 mm | | 25 | 73 mm |
| 55 | 73 mm | | | |

Because every bumper is 450 mm, a Metcon stack is a column of equal-height discs: **thickness,
face colour and the raised wordmark are how you tell them apart** — which is what the sleeve
close-up view is for.

Notes on fidelity:

- The 15 lb width is not published; it is interpolated between 10 lb and 25 lb and marked as
  inferred in the data.
- Below the bumpers, Metcon's lb range is **5 lb and 2.5 lb, both black**. They are modelled as
  change plates — smaller discs, off in the "bumpers only" presets — with typical geometry,
  since no widths are published. The smallest step on a Metcon bar is therefore 5 lb
  (2.5 lb a side).
- Face colours come from the Metcon product photography: **10 grey, 15 black, 25 green,
  35 yellow, 45 blue, 55 red**. That set overrides the generic IWF-style fallback palette.
  Only the 15 lb *width* is inferred (interpolated between 10 lb and 25 lb); its colour is known.

### Eleiko

IWF colour code (25 red, 20 blue, 15 yellow, 10 green, 5 white, then coloured change plates down
to 0.25 kg), full-diameter 450 mm competition bumpers from 10–25 kg, plus an optional IPF
calibrated-steel preset whose diameters scale with weight. An lb training set (45 / 35 / 25 / 10
plus steel change plates) is used when the unit is lb.

### Bars and collars

Men's 20 kg (220 cm, 28 mm), women's 15 kg (201 cm, 25 mm, no centre knurl), technique 10 kg,
US 45 lb, Metcon men's 20 kg (220 cm, 28 mm, 8 needle bearings, 1500 lb) and women's 15 kg
(200 cm, 25 mm, 1300 lb), trap 25 kg, and a custom bar. Collars: IWF competition 2.5 kg each,
Metcon Fast Clip (drawn on the bar, **0 kg**), or a generic gym clip.

Sleeve capacity is real: the app sums official plate widths plus the collar and warns when a
stack overruns the loadable sleeve (415 mm on a men's bar). Metcon 25 kg + 20 kg = 73 + 63 =
136 mm a side — there is a test for exactly that.

---

## Features

- Huge target control with stepper, quick chips and a gym-friendly keypad
- Live breakdown: `Bar 20 + collars 5 + plates 75 = 100 kg`
- Hero SVG barbell: knurling, marking rings, collars, mirrored plates, ground shadow,
  plates sliding on with a stagger (respects `prefers-reduced-motion`)
- Sleeve close-up, plate labels and a running total
- Combination cards with a sleeve thumbnail, plate list, count, capacity bar and badges
- Warm-up generator, % of 1RM table, next-jump and next-competition-increment chips
- Favourites and recents in their own sections. The star always saves, so two lifts can share a
  weight (clean 100 kg, squat 100 kg) and be told apart by name; removal is an explicit × on the
  favourite itself. Both lists carry their unit, and tapping an entry from the other unit
  switches brand with it — tap a 225 lb recent while in Eleiko and you land in Metcon at 225 lb,
  no conversion.
- Copy-summary and a kg ↔ lb convert view
- Gym mode (bigger type, higher contrast, less chrome — on by default on a small dark screen)
- Light and dark themes, both designed; theme follows the system until you override it

### URL parameters

Loads are shareable: `/?w=225&u=lb&brand=metcon&bar=us-45&collars=1`

| Param | Meaning |
|---|---|
| `w` | target weight |
| `u` | `kg` \| `lb` — implies the brand when `brand` is absent |
| `brand` | `eleiko` \| `metcon` |
| `bar` | bar id (or a number for a custom bar) |
| `collars` | `1` \| `0` |
| `change` | `0` to start bumpers-only |
| `sleeve` | `1` to open in the sleeve close-up |

---

## Architecture

```
src/
  data/plates.ts          all plate, bar, collar and preset definitions
  lib/combinations.ts     the engine — pure, integer maths, unit-tested
  lib/settings.ts         settings shape, hydration, loadout resolution
  lib/warmup.ts           ramps, % of 1RM, next jump
  lib/format.ts           units, conversion, formatting
  components/
    BarbellSVG.tsx        hero bar + sleeve thumbnail
    PlateSVG.tsx          Eleiko / Metcon / steel plate profiles and collars
    WeightInput.tsx  ComboList.tsx  ComboCard.tsx  EmptyState.tsx
    InventoryEditor.tsx   inventory + the Setup sheet
    WarmupPanel.tsx  Header.tsx  ThemeToggle.tsx  ui.tsx
  hooks/useSettings.ts    localStorage, URL sync, theme, gym mode
  App.tsx
```

TypeScript strict throughout. Tailwind for layout, CSS variables for theming (`class="dark"`).

## Accessibility

Every control is labelled; the sheet traps focus, opens on its first field and closes on
Escape; results announce politely; focus rings are visible;
touch targets are at least 44 px; animation is disabled under `prefers-reduced-motion`; and the
barbell exposes a text description of the current load.

## Deviations from the brief, stated plainly

- The Vite scaffold ships **React 19** rather than React 18. Nothing in the app depends on the
  difference.
- The 15 lb Metcon width is interpolated (see above), as is change-plate geometry.
- Metcon lb face colours are taken from product photography (10 grey, 15 black, 25 green,
  35 yellow, 45 blue, 55 red).
