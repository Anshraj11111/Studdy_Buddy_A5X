/**
 * Haptic Feedback Utility for Premium Feel
 * Uses Web Vibration API for mobile browsers
 */

// Check if device supports haptic feedback
export const isHapticSupported = () => {
  return 'vibrate' in navigator;
};

// Haptic patterns (in milliseconds)
export const HapticPattern = {
  LIGHT: [10],           // Light tap - for subtle interactions
  MEDIUM: [20],          // Standard button press
  HEAVY: [30],           // Important action
  SUCCESS: [10, 50, 10], // Success - double tap
  ERROR: [20, 100, 20, 100, 20], // Error - buzz pattern
  WARNING: [40],         // Warning - single longer buzz
  SELECTION: [5],        // Selection - very light tap
};

// Trigger haptic feedback
export const triggerHaptic = (pattern = HapticPattern.MEDIUM) => {
  // Check if haptics are enabled in user preferences
  const hapticsEnabled = localStorage.getItem('hapticsEnabled') !== 'false';
  
  if (!hapticsEnabled || !isHapticSupported()) {
    return;
  }
  
  try {
    navigator.vibrate(pattern);
  } catch (error) {
    // Silent fail - device doesn't support vibration
  }
};

// Quick functions for common interactions
export const hapticLight = () => triggerHaptic(HapticPattern.LIGHT);
export const hapticMedium = () => triggerHaptic(HapticPattern.MEDIUM);
export const hapticHeavy = () => triggerHaptic(HapticPattern.HEAVY);
export const hapticSuccess = () => triggerHaptic(HapticPattern.SUCCESS);
export const hapticError = () => triggerHaptic(HapticPattern.ERROR);
export const hapticWarning = () => triggerHaptic(HapticPattern.WARNING);
export const hapticSelection = () => triggerHaptic(HapticPattern.SELECTION);

// Enable/disable haptics
export const setHapticsEnabled = (enabled) => {
  localStorage.setItem('hapticsEnabled', enabled.toString());
};

export const getHapticsEnabled = () => {
  return localStorage.getItem('hapticsEnabled') !== 'false';
};

export default {
  trigger: triggerHaptic,
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,
  success: hapticSuccess,
  error: hapticError,
  warning: hapticWarning,
  selection: hapticSelection,
  isSupported: isHapticSupported,
  enabled: getHapticsEnabled,
  setEnabled: setHapticsEnabled,
  HapticPattern,
};
