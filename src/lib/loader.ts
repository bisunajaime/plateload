import type { CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo } from './combinations'
import { fmt } from './format'

export interface LoaderStep {
  key: string
  text: string
  color?: string
  textColor?: string
  count: number
}

/** “Two 25s each side, then a 10, then clips.” */
export function loaderSteps(
  combo: Combo,
  plates: PlateDef[],
  unit: Unit,
  collarKind: CollarKind | null,
): LoaderStep[] {
  const byId = new Map(plates.map((p) => [p.id, p]))
  const steps: LoaderStep[] = combo.plates.map((p) => {
    const def = byId.get(p.id)
    return {
      key: p.id,
      text: p.count > 1 ? `${p.count} × ${fmt(p.weight)} ${unit}` : `${fmt(p.weight)} ${unit}`,
      color: def?.color,
      textColor: def?.textColor,
      count: p.count,
    }
  })
  if (!steps.length) steps.push({ key: 'bare', text: 'Bare bar', count: 0 })
  if (collarKind) {
    steps.push({
      key: 'collar',
      text:
        collarKind === 'metcon-fastclip'
          ? 'Fast Clips on'
          : collarKind === 'eleiko-competition'
            ? 'Competition collars on'
            : 'Clips on',
      count: 1,
    })
  }
  return steps
}
