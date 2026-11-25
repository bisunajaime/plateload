import { useCallback, useRef, useState } from 'react'
import type { ToastData } from '../components/Toast'

/** One toast at a time: a newer one replaces the old, it never queues behind it. */
export function useToast() {
  const [toast, setToast] = useState<(ToastData & { id: number }) | null>(null)
  const seq = useRef(0)
  const show = useCallback((t: ToastData) => setToast({ ...t, id: ++seq.current }), [])
  const dismiss = useCallback(() => setToast(null), [])
  return { toast, show, dismiss }
}
