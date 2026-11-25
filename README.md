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
npm run dev        # landing page at http://localhost:5173, the calculator at /app/
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

"Other ways to load it" shows the top three; the rest, and the ranking, are one tap away.

| Mode (as labelled) | Sorts by |
|---|---|
| **Recommended** | fits the sleeve → fewest plates → competition order → fewest small plates |
| **Meet order** (`competition`) | largest plates innermost (lexicographic maximum — the platform-standard stack) |
| **Fewest plates** (`fewest`) | plate count per side |
| **Shortest stack** (`compact`) | shortest stack, using official plate widths plus the collar |

Each row says why in plain words ("Fewest plates", "Biggest plates inside — how a meet loads it",
"Too wide for the sleeve"); `src/components/ways/reasons.ts` keeps jargon out, under test.

### When nothing fits

The empty state is a teaching state: it names the nearest loadable weights above and below,
offers them as one-tap buttons, and — when change plates are switched off — offers to turn them
back on. This happens a lot with Metcon, whose catalogue is bumpers only.

---

## How inventory works

Counts are **whole-gym counts**: how many of that plate exist in the building. Because loading
is symmetric, the engine uses `floor(count / 2)` per side. Three 25s therefore give you one 25 a
side, not one and a half.

Open the **Gym** tab to edit counts, pick a preset, choose the bar and collars, and flip the
**small plates** (change plates) switch. Presets ship for: Eleiko competition platform, Eleiko
training hall, Eleiko bumpers only and home gym (kg), Eleiko lb set, Metcon coloured gym (lb),
Metcon black gym (kg), Metcon bumpers only (kg and lb), and sparse home gyms. Applying one can be
undone.

Collars default to what a gym actually uses: Metcon's Fast Clip, or a spring clip (0 kg) on an
Eleiko bar. IWF competition collars (2.5 kg each) are a choice in Gym → Collars.

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

PlateLoad is four places, under a tab bar on a phone (the load pinned beside the others on a desktop):

- **Load** — the weight as a scoreboard (tap the ✎ to type it; a physical keyboard works in the
  keypad too), the plates each side as big pills, the drawn bar (tap it for whole bar / close-up),
  − / + that show where they land and repeat when held, ±5/10/25 (or ±2.5/5/10 kg) jumps, Save and
  Share, a saved-and-recent strip, and "Other ways to load it". A weight the plates can't make
  says why ("your plates go up in 5 lb steps") and offers the nearest ones.
- **Warm-up** — a ramp to your working weight or a table of percentages of your max; every row
  shows its own plates, and a pinned summary keeps what's on the bar in view.
- **Saved** — saved weights grouped by lift (update, rename, delete — all undoable) and recent ones.
  A weight saved in the other unit switches brand with it, with Undo.
- **Gym** — your plates first (presets, counts, small plates on/off), then the bar and collars,
  then display, sounds and vibration, and erase-everything (press and hold).

Around them:

- **Feel:** plates slide on, glide and come off; the bar dips as the last one seats; the number rolls
  like a scoreboard. Motion tokens live in `src/index.css` and `src/feel/motion.ts` (a test keeps
  them in step); sound (synthesised, **off by default**) and haptics go through `src/feel`.
- **Forgiveness:** brand switches, presets, deletes and the world-record easter egg apply at once
  with Undo (⌘Z / Ctrl+Z works too) — and Undo refuses if things have changed since.
- **Moments:** two, three, four plates get a caption and some chalk. Hold the logo for a surprise.
- Gym mode (bigger type, stronger text); light and dark themes that follow the system until you
  choose; works offline once loaded, and says so.


## Architecture

```
src/
  data/plates.ts          all plate, bar, collar and preset definitions
  lib/                    pure, unit-tested: combinations (the engine), settings, warmup,
                          stack (plate enter/exit diff), milestones, format
  feel/                   motion tokens, reduced motion, haptics, sound, feedback(moment), hold-to-repeat
  app/useAppModel.ts      app state and every action; screens read it through useApp()
  screens/                Load, Other ways, Saved strip, Warm-up, Saved, Gym
  components/
    kit/                  Button, Chip, Choice, Switch, Field, Stepper, PlatePill, Section, icons
    shell/                tab bar, plates-and-units sheet, first-run welcome
    load/ ways/ saved/    screen parts
    BarbellSVG.tsx PlateSVG.tsx   the drawing (shared with the landing page)
    ui.tsx                Sheet (animated, drag to dismiss)
  landing/                the landing page at /
  App.tsx                 the shell: header, tabs / two-pane layout, toasts
```

TypeScript strict throughout. Tailwind for layout; colours, motion and type come from tokens
(`src/index.css`, `tailwind.config.js`).


## Accessibility

- Contrast: text meets WCAG AA in both themes; the edges of controls are 3:1 or better; black
  and white plates carry an edge so they never vanish against the page.
- Every control has a name; icon-only buttons say what they do. Targets are at least 44 px.
- Keyboard: everything works from the keyboard, including the keypad, the radio groups (arrow
  keys), hold-to-repeat steppers (ordinary presses), erase-everything (press twice) and moving the
  floating preview (arrow keys). Focus is visible, trapped in sheets, and never dropped to the page.
- Screen readers: one h1 and a heading per section; the load is announced once it settles (not on
  every step), with the reason and the nearest weights when it can't be made; refused or corrected
  input is explained in words.
- Reduced motion: movement becomes a fade or an instant change. Sound is off by default, follows
  the silent switch, and nothing is ever said only by sound or vibration.


## Deviations from the brief, stated plainly

- The Vite scaffold ships **React 19** rather than React 18. Nothing in the app depends on the
  difference.
- The 15 lb Metcon width is interpolated (see above), as is change-plate geometry.
- Metcon lb face colours are taken from product photography (10 grey, 15 black, 25 green,
  35 yellow, 45 blue, 55 red).
