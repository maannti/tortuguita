import { WebHaptics } from "web-haptics"

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'

let instance: WebHaptics | null = null

function getHaptics(): WebHaptics | null {
  if (typeof window === 'undefined') return null
  if (!instance) {
    instance = new WebHaptics()
  }
  return instance
}

const patterns: Record<HapticPattern, number | string> = {
  light: 10,
  medium: 20,
  heavy: 50,
  success: 'success',
  error: 'error',
  selection: 5,
}

export function haptic(pattern: HapticPattern = 'light'): void {
  const haptics = getHaptics()
  if (!haptics) return

  const value = patterns[pattern]
  haptics.trigger(value as any)
}

export function isHapticSupported(): boolean {
  return typeof window !== 'undefined'
}
