import { useEffect, useState, type ReactNode } from 'react'
import { duration } from '../feel'

export interface ToastData {
  message: ReactNode
  /** One action, usually Undo. */
  action?: { label: string; run: () => void }
  tone?: 'default' | 'bad'
}

/**
 * Quiet confirmation at the bottom of the screen. It stays up a little longer
 * when there's something to undo, and never while your pointer or focus is
 * on it. The live region is always mounted so screen readers hear each one.
 */
export function Toaster({ toast, onDismiss }: { toast: (ToastData & { id: number }) | null; onDismiss: () => void }) {
  // Keep the last toast drawn while it animates out.
  const [shown, setShown] = useState(toast)
  const [leaving, setLeaving] = useState(false)
  if (toast && toast.id !== shown?.id) {
    setShown(toast)
    setLeaving(false)
  }
  if (!toast && shown && !leaving) setLeaving(true)

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(() => {
      setShown(null)
      setLeaving(false)
    }, duration.quick)
    return () => window.clearTimeout(t)
  }, [leaving])

  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (!toast || held) return
    const t = window.setTimeout(onDismiss, toast.action ? 6000 : 3200)
    return () => window.clearTimeout(t)
  }, [toast, held, onDismiss])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-3"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {shown && (
        <div
          key={shown.id}
          className={`pointer-events-auto flex min-h-[48px] max-w-md items-center gap-3 rounded-2xl bg-ink py-1.5 pl-4 pr-1.5 text-sm text-bg shadow-2xl ${
            leaving ? 'toast-out' : 'toast-in'
          }`}
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          {shown.tone === 'bad' && <span className="h-2 w-2 shrink-0 rounded-full bg-bad" aria-hidden="true" />}
          <span className="py-2">{shown.message}</span>
          {shown.action ? (
            <button
              type="button"
              className="min-h-[44px] shrink-0 rounded-xl px-3 font-semibold text-bg transition hover:bg-bg/10 active:scale-press focus-visible:[--tw-ring-color:rgb(var(--bg))] focus-visible:[--tw-ring-offset-color:rgb(var(--ink))]"
              onClick={() => {
                shown.action?.run()
                onDismiss()
              }}
            >
              {shown.action.label}
            </button>
          ) : (
            <span className="w-2.5" />
          )}
        </div>
      )}
    </div>
  )
}
