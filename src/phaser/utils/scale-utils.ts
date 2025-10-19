/**
 * Scaling utilities for responsive UI elements.
 * Handles font size, padding, and position calculations based on screen dimensions.
 */

import * as GameConfig from "@/phaser/config/game-config";

/**
 * Creates scaling utility functions for a specific original resolution.
 *
 * Returns an object with methods to calculate scaled font sizes, positions,
 * and padding based on current screen dimensions relative to original design.
 *
 * Performance: Factory function O(1)
 * - Time per call: <0.001ms (creates closure)
 * - Memory: ~100 bytes (closure state)
 * - Called once per scene initialization
 *
 * @param originalWidth - Original design width
 * @param originalHeight - Original design height
 * @returns Object with scaling functions
 */
export const createScaleUtils = (originalWidth: number, originalHeight: number) => {
  /**
   * Calculates scaled font size based on current height relative to original height.
   *
   * Scales font size proportionally to screen height to maintain readability
   * across different resolutions. Rounds to integer for pixel-perfect rendering.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (arithmetic + round)
   * - Memory: Negligible (no allocations)
   * - Called during UI initialization and resize events
   */
  const getScaledFontSize = (baseFontSize: number, currentHeight: number): number =>
    Math.round((baseFontSize * currentHeight) / originalHeight);

  /**
   * Calculates the scale factor for the current resolution.
   *
   * Returns the ratio of current height to original height, used for
   * scaling UI elements proportionally.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single division)
   * - Memory: Negligible (no allocations)
   * - Called during UI updates and resize events
   */
  const getScaleFactor = (currentHeight: number): number => currentHeight / originalHeight;

  /**
   * Calculates tutorial text padding based on screen height.
   *
   * Positions tutorial text at a fixed vertical ratio of screen height.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single multiplication + object creation)
   * - Memory: ~50 bytes (padding object)
   * - Called during UI initialization and resize events
   */
  const getTutorialTextPadding = (height: number) => ({
    top: height * GameConfig.TUTORIAL_VERTICAL_POSITION,
    bottom: 0,
  });

  /**
   * Calculates start button position based on screen dimensions.
   *
   * Centers button horizontally and positions at 60% of screen height.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (2 arithmetic operations + object creation)
   * - Memory: ~50 bytes (position object)
   * - Called during UI initialization and resize events
   */
  const getStartButtonPosition = (width: number, height: number) => ({
    x: width / 2,
    y: height * 0.6,
  });

  /**
   * Calculates game over text padding based on screen height.
   *
   * Centers game over text vertically with offset for visual balance.
   *
   * Performance: O(1)
   * - Time per call: ~0.001ms (2 function calls + arithmetic + object creation)
   * - Memory: ~50 bytes (padding object)
   * - Called during UI initialization and resize events
   */
  const getGameOverTextPadding = (height: number) => {
    const scaledFontSize = getScaledFontSize(GameConfig.GAMEOVER_FONT_SIZE, height);
    const scaledOffset = getScaledFontSize(GameConfig.GAMEOVER_VERTICAL_OFFSET, height);
    return {
      top: (height - scaledOffset - scaledFontSize) / 2,
      bottom: 0,
    };
  };

  /**
   * Calculates restart button position based on screen dimensions.
   *
   * Centers button horizontally and positions below game over text.
   *
   * Performance: O(1)
   * - Time per call: ~0.001ms (1 function call + arithmetic + object creation)
   * - Memory: ~50 bytes (position object)
   * - Called during UI initialization and resize events
   */
  const getRestartButtonPosition = (width: number, height: number) => {
    const scaledFontSize = getScaledFontSize(GameConfig.GAMEOVER_FONT_SIZE, height);
    return {
      x: width / 2,
      y: height / 2 + scaledFontSize,
    };
  };

  /**
   * Calculates error text padding based on screen height.
   *
   * Positions error text at 25% from top of screen.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single multiplication + object creation)
   * - Memory: ~50 bytes (padding object)
   * - Called during UI initialization (only if no input detected)
   */
  const getErrorTextPadding = (height: number) => ({
    top: height * 0.25,
    bottom: 0,
  });

  return {
    getScaledFontSize,
    getScaleFactor,
    getTutorialTextPadding,
    getStartButtonPosition,
    getGameOverTextPadding,
    getRestartButtonPosition,
    getErrorTextPadding,
  };
};

export type ScaleUtils = ReturnType<typeof createScaleUtils>;
