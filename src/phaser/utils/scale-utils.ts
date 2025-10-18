/**
 * Scaling utilities for responsive UI elements.
 * Handles font size, padding, and position calculations based on screen dimensions.
 */

import * as GameConfig from "@/phaser/config/game-config";

/**
 * Creates scaling utility functions for a specific original resolution.
 * 
 * @param originalWidth - Original design width
 * @param originalHeight - Original design height
 * @returns Object with scaling functions
 */
export const createScaleUtils = (
  originalWidth: number,
  originalHeight: number
) => {
  /**
   * Calculates scaled font size based on current height relative to original height.
   */
  const getScaledFontSize = (
    baseFontSize: number,
    currentHeight: number
  ): number => Math.round((baseFontSize * currentHeight) / originalHeight);

  /**
   * Calculates the scale factor for the current resolution.
   */
  const getScaleFactor = (currentHeight: number): number =>
    currentHeight / originalHeight;

  /**
   * Calculates tutorial text padding based on screen height.
   */
  const getTutorialTextPadding = (height: number) => ({
    top: height * GameConfig.TUTORIAL_VERTICAL_POSITION,
    bottom: 0,
  });

  /**
   * Calculates start button position based on screen dimensions.
   */
  const getStartButtonPosition = (width: number, height: number) => ({
    x: width / 2,
    y: height * 0.6,
  });

  /**
   * Calculates game over text padding based on screen height.
   */
  const getGameOverTextPadding = (height: number) => {
    const scaledFontSize = getScaledFontSize(
      GameConfig.GAMEOVER_FONT_SIZE,
      height
    );
    const scaledOffset = getScaledFontSize(
      GameConfig.GAMEOVER_VERTICAL_OFFSET,
      height
    );
    return {
      top: (height - scaledOffset - scaledFontSize) / 2,
      bottom: 0,
    };
  };

  /**
   * Calculates restart button position based on screen dimensions.
   */
  const getRestartButtonPosition = (width: number, height: number) => {
    const scaledFontSize = getScaledFontSize(
      GameConfig.GAMEOVER_FONT_SIZE,
      height
    );
    return {
      x: width / 2,
      y: height / 2 + scaledFontSize,
    };
  };

  /**
   * Calculates error text padding based on screen height.
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

