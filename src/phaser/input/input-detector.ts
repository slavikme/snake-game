/**
 * Input device detection utilities.
 * Detects and tracks touch and keyboard input capabilities.
 */

import Phaser from "phaser";

export type InputDevice = "touch" | "keyboard";

/**
 * Creates input detection utilities for a Phaser scene.
 *
 * Returns an object with methods to detect and track touch and keyboard input.
 * Maintains state about detected input devices and primary input method.
 *
 * Performance: Factory function O(1)
 * - Time per call: <0.001ms (creates closure)
 * - Memory: ~150 bytes (closure state)
 * - Called once per scene initialization
 */
export const createInputDetector = (scene: Phaser.Scene) => {
  let hasDetectedKeyboard = false;
  let hasDetectedTouch = false;
  let primaryInputDevice: InputDevice | undefined;

  /**
   * Determines if the device has touch input capability.
   *
   * Checks both device capabilities and actual usage history.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (2 boolean checks)
   * - Memory: Negligible (no allocations)
   * - Called frequently during input detection and UI updates
   */
  const hasTouchCapability = (): boolean => {
    const hasCapability = scene.sys.game.device.input.touch;
    const hasUsed = hasDetectedTouch;
    return hasCapability || hasUsed;
  };

  /**
   * Determines if the device has a physical keyboard.
   *
   * Uses heuristics based on OS detection and actual keyboard usage.
   * Desktop OS are assumed to have keyboards unless proven otherwise.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (multiple boolean checks)
   * - Memory: Negligible (no allocations)
   * - Called frequently during input detection and UI updates
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
   *
   * Returns true if either touch or keyboard input is available.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (calls 2 other O(1) functions)
   * - Memory: Negligible (no allocations)
   * - Called once during scene initialization
   */
  const hasRequiredInputCapabilities = (): boolean => {
    return hasTouchCapability() || hasPhysicalKeyboard();
  };

  /**
   * Formats input device status for display in stats UI.
   *
   * Creates a compact string showing touch/keyboard availability and primary device.
   * Format: "T:✓ K:✓ (K)" where ✓/✗ indicate availability and (K)/(T) shows primary.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (string concatenation)
   * - Memory: ~30 bytes (result string)
   * - Main costs:
   *   • String concatenation: O(1) - fixed-size strings
   *   • Ternary operations: O(1) - 3 conditional checks
   * - Called 60 times per second (every frame for stats display)
   */
  const getInputStatusDisplay = (): string => {
    const touch = hasTouchCapability() ? "✓" : "✗";
    const keyboard = hasPhysicalKeyboard() ? "✓" : "✗";
    const primary = primaryInputDevice ? ` (${primaryInputDevice === "touch" ? "T" : "K"})` : "";
    return `T:${touch} K:${keyboard}${primary}`;
  };

  /**
   * Detects and saves the primary input device from a pointer event.
   * Prefers keyboard if both touch and keyboard are available.
   *
   * Analyzes pointer properties and device capabilities to determine the
   * most appropriate primary input method.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (conditional checks)
   * - Memory: Negligible (no allocations)
   * - Called once during game start
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
   *
   * Registers event handlers that fire when keyboard or touch input is first detected.
   * These handlers update internal state and call optional callbacks.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (registers 2 event listeners)
   * - Memory: ~200 bytes (2 event handler closures)
   * - Main costs:
   *   • Event listener registration: O(1) - 2 listeners
   *   • Closure creation: O(1) - 2 closures
   * - Called once per scene initialization
   */
  const setupDetectionListeners = (onKeyboardDetected?: () => void, onTouchDetected?: () => void): void => {
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
