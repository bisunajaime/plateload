/* Icons: 24-unit grid, 1.8 stroke, round caps and joins, 20 px by default. */

const ico = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const XIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const GearIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.63.7 1.09 1.35 1.09H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
)
export const SunIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const MoonIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
)
export const SystemIcon = () => (
  <svg {...ico} aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 20h8" /></svg>
)
export const PlusIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)
export const MinusIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M5 12h14" /></svg>
)
export const StarIcon = ({ filled = false, size = 20 }: { filled?: boolean; size?: number }) => (
  <svg {...ico} width={size} height={size} fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9Z" /></svg>
)
export const CopyIcon = () => (
  <svg {...ico} aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
)
export const ZoomIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6M11 8v6" /></svg>
)
export const ChevronIcon = ({ open = false }: { open?: boolean }) => (
  <svg {...ico} width={16} height={16} aria-hidden="true" className={open ? 'rotate-90 transition' : 'transition'}><path d="m9 5 7 7-7 7" /></svg>
)

/* New for the redesign — same grid, stroke and caps as the rest. */
export const PencilIcon = ({ size = 20 }: { size?: number }) => (
  <svg {...ico} width={size} height={size} aria-hidden="true"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
)
export const ShareIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4 4 4" /><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1" /></svg>
)
export const CheckIcon = ({ draw = false }: { draw?: boolean }) => (
  <svg {...ico} strokeWidth={2} aria-hidden="true"><path className={draw ? 'draw' : undefined} pathLength={1} d="M5 12.5 10 17.5 19 7" /></svg>
)
export const TrashIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
)
export const ChevronDownIcon = () => (
  <svg {...ico} width={16} height={16} aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
)
/** A loaded bar, end-on: the Load tab. */
export const BarbellIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M2 12h20" /><rect x="5" y="6" width="3" height="12" rx="1" /><rect x="16" y="6" width="3" height="12" rx="1" /><rect x="8" y="8.5" width="2" height="7" rx="0.6" /><rect x="14" y="8.5" width="2" height="7" rx="0.6" /></svg>
)
/** Steps climbing: the Warm-up tab. */
export const RampIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M3 20h4v-4h4v-4h4V8h4V4" /><path d="M3 20h18" /></svg>
)
/** A bookmark: the Saved tab. */
export const BookmarkIcon = ({ filled = false }: { filled?: boolean }) => (
  <svg {...ico} fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg>
)
/** A plate face-on: the Gym tab. */
export const PlateIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></svg>
)
