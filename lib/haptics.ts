/**
 * Haptic feedback utilities for mobile web
 * Uses the Web Vibration API: https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'

const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,      // Light tap for buttons, selections
  medium: 20,     // Medium feedback for toggles
  heavy: 40,      // Strong feedback for important actions
  success: [10, 30, 10],  // Short-pause-short for success
  error: [40, 30, 40],    // Longer pulses for errors
  selection: 5,   // Very light for list selections
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

/**
 * Trigger haptic feedback with a specific pattern
 */
export function haptic(pattern: HapticPattern = 'light'): void {
  if (!isHapticSupported()) return

  try {
    navigator.vibrate(patterns[pattern])
  } catch {
    // Silently fail if vibration not allowed
  }
}

/**
 * Trigger a custom haptic pattern
 * @param duration - Duration in ms or array of [vibrate, pause, vibrate, ...]
 */
export function hapticCustom(duration: number | number[]): void {
  if (!isHapticSupported()) return

  try {
    navigator.vibrate(duration)
  } catch {
    // Silently fail if vibration not allowed
  }
}

/**
 * Stop any ongoing vibration
 */
export function hapticStop(): void {
  if (!isHapticSupported()) return

  try {
    navigator.vibrate(0)
  } catch {
    // Silently fail
  }
}
