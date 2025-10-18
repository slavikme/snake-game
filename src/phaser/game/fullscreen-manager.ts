/**
 * Fullscreen management utilities.
 */

import Phaser from "phaser";

/**
 * Creates fullscreen management utilities.
 */
export const createFullscreenManager = (
  scene: Phaser.Scene,
  originalWidth: number,
  originalHeight: number
) => {
  /**
   * Handles entering fullscreen mode by adjusting resolution to match screen size.
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

