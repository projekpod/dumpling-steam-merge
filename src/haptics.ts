import type { SaveStore } from './platform'
import { HAPTICS_KEY } from './save-keys'

export function mountHaptics(store: SaveStore) {
  if (!/Android/i.test(navigator.userAgent) || typeof navigator.vibrate !== 'function') return

  const input = document.querySelector<HTMLInputElement>('#haptics')!
  input.closest('label')!.hidden = false
  input.checked = true
  try { input.checked = store.getItem(HAPTICS_KEY) !== 'off' } catch {
    // Keep the default if the preference cannot be read.
  }
  input.addEventListener('change', () => {
    try { store.setItem(HAPTICS_KEY, input.checked ? 'on' : 'off') } catch {
      // Retain the preference until this session closes.
    }
  })
  return (economyMode: boolean) => {
    if (input.checked && !economyMode) navigator.vibrate(25)
  }
}
