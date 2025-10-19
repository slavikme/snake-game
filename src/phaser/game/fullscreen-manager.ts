/**
 * Fullscreen management utilities.
 */

import Phaser from "phaser";

/**
 * Creates fullscreen management utilities.
 *
 * Returns an object with methods to handle entering and exiting fullscreen mode.
 * Maintains aspect ratio while maximizing screen usage.
 *
 * Performance: Factory function O(1)
 * - Time per call: <0.001ms (creates closure)
 * - Memory: ~50 bytes (closure state)
 * - Called once per scene initialization
 */
export const createFullscreenManager = (scene: Phaser.Scene, originalWidth: number, originalHeight: number) => {
  /**
   * Handles entering fullscreen mode by adjusting resolution to match screen size.
   *
   * Calculates optimal dimensions that fit the screen while maintaining the original
   * aspect ratio (16:9). Resizes the game canvas to these new dimensions.
   *
   * Performance: O(1)
   * - Time per call: ~5-10ms (triggers scene resize and re-render)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Aspect ratio calculations: O(1) - arithmetic operations
   *   • Scene resize: O(1) - Phaser internal resize
   *   • Console log: O(1) - string formatting
   * - Called 0-2 times per session (when entering fullscreen)
   */
  const handleEnterFullscreen = (): void => {
    // Get the screen dimensions
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    // Calculate aspect ratio of original resolution (should be 16:9 = 1.777...)
    const targetAspectRatio = originalWidth / originalHeight;

    // Calculate dimensions that fit the screen while maintaining aspect ratio
    let newWidth = screenWidth;
    let newHeight = screenWidth / targetAspectRatio;

    // If height exceeds screen height, constrain by height instead
    if (newHeight > screenHeight) {
      newHeight = screenHeight;
      newWidth = screenHeight * targetAspectRatio;
    }

    // Round to integers for pixel-perfect rendering
    newWidth = Math.round(newWidth);
    newHeight = Math.round(newHeight);

    console.log(
      `Entering fullscreen: ${screenWidth}x${screenHeight} -> ${newWidth}x${newHeight} (aspect ratio: ${targetAspectRatio.toFixed(
        3
      )})`
    );

    // Resize the game to match calculated dimensions
    scene.scale.resize(newWidth, newHeight);
  };

  /**
   * Handles exiting fullscreen mode by restoring original resolution.
   *
   * Resizes the game canvas back to the original dimensions that were
   * captured during scene initialization.
   *
   * Performance: O(1)
   * - Time per call: ~5-10ms (triggers scene resize and re-render)
   * - Memory: Negligible (no allocations)
   * - Main costs:
   *   • Scene resize: O(1) - Phaser internal resize
   *   • Console log: O(1) - string formatting
   * - Called 0-2 times per session (when exiting fullscreen)
   */
  const handleExitFullscreen = (): void => {
    console.log(`Exiting fullscreen: ${originalWidth}x${originalHeight}`);

    // Restore original dimensions
    scene.scale.resize(originalWidth, originalHeight);
  };

  return {
    handleEnterFullscreen,
    handleExitFullscreen,
  };
};

export type FullscreenManager = ReturnType<typeof createFullscreenManager>;
