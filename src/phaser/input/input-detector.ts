/**
 * Input device detection utilities.
 * Detects and tracks touch and keyboard input capabilities.
 */

import Phaser from "phaser";

export type InputDevice = "touch" | "keyboard";

/**
 * Creates input detection utilities for a Phaser scene.
 */
export const createInputDetector = (scene: Phaser.Scene) => {
  let hasDetectedKeyboard = false;
  let hasDetectedTouch = false;
  let primaryInputDevice: InputDevice | undefined;

  /**
   * Determines if the device has touch input capability.
   */
  const hasTouchCapability = (): boolean => {
    const hasCapability = scene.sys.game.device.input.touch;
    const hasUsed = hasDetectedTouch;
    return hasCapability || hasUsed;
  };

  /**
   * Determines if the device has a physical keyboard.
   */
  const hasPhysicalKeyboard = (): boolean => {
    // If we've actually detected keyboard usage, it definitely exists
    if (hasDetectedKeyboard) {
      return true;
    }

    // Check if keyboard is enabled
    if (!scene.input.keyboard?.enabled) {
      return false;
    }

    // Use heuristics as a starting point, but don't be absolute
    const device = scene.sys.game.device;
    const os = device.os;

    // Desktop OS likely has keyboard (but can be overridden by actual usage)
    if (os.desktop || os.macOS || os.windows || os.linux || os.chromeOS) {
      return true;
    }

    // Mobile devices might have keyboard, can't be certain
    // Return false by default, but actual keyboard events will override this
    return false;
  };

  /**
   * Validates that the device has at least one supported input method.
   */
  const hasRequiredInputCapabilities = (): boolean => {
    return hasTouchCapability() || hasPhysicalKeyboard();
  };

  /**
   * Formats input device status for display in stats UI.
   */
  const getInputStatusDisplay = (): string => {
    const touch = hasTouchCapability() ? "✓" : "✗";
    const keyboard = hasPhysicalKeyboard() ? "✓" : "✗";
    const primary = primaryInputDevice
      ? ` (${primaryInputDevice === "touch" ? "T" : "K"})`
      : "";
    return `T:${touch} K:${keyboard}${primary}`;
  };

  /**
   * Detects and saves the primary input device from a pointer event.
   * Prefers keyboard if both touch and keyboard are available.
   */
  const detectPrimaryInput = (pointer: Phaser.Input.Pointer): InputDevice => {
    if (hasPhysicalKeyboard() && hasTouchCapability()) {
      // Both available: prefer keyboard
      primaryInputDevice = "keyboard";
    } else if (pointer.wasTouch) {
      primaryInputDevice = "touch";
    } else {
      primaryInputDevice = "keyboard";
    }
    return primaryInputDevice;
  };

  /**
   * Sets up event listeners to detect keyboard and touch usage.
   */
  const setupDetectionListeners = (
    onKeyboardDetected?: () => void,
    onTouchDetected?: () => void
  ): void => {
    // Listen for any keyboard input to detect physical keyboard
    scene.input.keyboard?.on("keydown", () => {
      if (!hasDetectedKeyboard) {
        hasDetectedKeyboard = true;
        onKeyboardDetected?.();
      }
    });

    // Listen for touch events to detect touch usage
    scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch && !hasDetectedTouch) {
        hasDetectedTouch = true;
        onTouchDetected?.();
      }
    });
  };

  return {
    hasTouchCapability,
    hasPhysicalKeyboard,
    hasRequiredInputCapabilities,
    getInputStatusDisplay,
    detectPrimaryInput,
    setupDetectionListeners,
    getPrimaryInputDevice: () => primaryInputDevice,
    setPrimaryInputDevice: (device: InputDevice) => {
      primaryInputDevice = device;
    },
  };
};

export type InputDetector = ReturnType<typeof createInputDetector>;

