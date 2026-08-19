/** Spoken cues for the loader view and the “announce combo” toggle. */
export function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 1
    window.speechSynthesis.speak(u)
  } catch {
    /* speech is a nicety, never a requirement */
  }
}

export const speechAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window
