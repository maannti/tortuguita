/**
 * Haptic feedback utilities for mobile web
 *
 * iOS Safari: Uses hidden <input type="checkbox" switch /> trick (Safari 17.4+)
 * Android: Falls back to Web Vibration API
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection'

const vibrationPatterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 30, 10],
  error: [40, 30, 40],
  selection: 5,
}

/**
 * Detect if we're on iOS Safari
 */
function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua)
  return isIOS && isSafari
}

/**
 * Check if standard Vibration API is supported
 */
function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}

/**
 * iOS Safari haptic using hidden switch input trick
 * Safari 17.4+ has native haptic feedback on switch inputs
 */
function triggerIOSHaptic(): void {
  try {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.style.cssText = 'position:fixed;top:-100px;left:-100px;opacity:0;pointer-events:none;'
    document.body.appendChild(input)

    // Toggle to trigger haptic
    input.checked = true
    input.click()

    // Clean up
    requestAnimationFrame(() => {
      input.remove()
    })
  } catch {
    // Silently fail
  }
}

/**
 * Android/other browsers using Vibration API
 */
function triggerVibration(pattern: HapticPattern): void {
  try {
    navigator.vibrate(vibrationPatterns[pattern])
  } catch {
    // Silently fail
  }
}

/**
 * Trigger haptic feedback
 * Automatically uses the appropriate method for the platform
 */
export function haptic(pattern: HapticPattern = 'light'): void {
  if (typeof window === 'undefined') return

  if (isIOSSafari()) {
    // iOS Safari: use switch input trick
    // Note: iOS doesn't support different intensities via this method
    triggerIOSHaptic()
  } else if (isVibrationSupported()) {
    // Android/other: use Vibration API
    triggerVibration(pattern)
  }
}

/**
 * Check if haptic feedback is likely supported
 */
export function isHapticSupported(): boolean {
  return isIOSSafari() || isVibrationSupported()
}
