/**
 * Text factory for creating styled game text elements.
 */

import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";
import type { ScaleUtils } from "@/phaser/utils/scale-utils";

/**
 * Creates the stats display text.
 *
 * Creates a text object for displaying game statistics (score, FPS, input status).
 * Positioned at top-left with background and padding.
 *
 * Performance: O(1)
 * - Time per call: ~0.02ms (creates 1 text object)
 * - Memory: ~200 bytes (text object)
 * - Main costs:
 *   • Text creation: O(1) - single Phaser text object
 * - Called once per scene initialization
 */
export const createStatsText = (scene: Phaser.Scene): Phaser.GameObjects.Text => {
  return scene.add
    .text(0, 0, "", {
      fontFamily: GameConfig.STATS_FONT_FAMILY,
      fontSize: GameConfig.STATS_FONT_SIZE,
      color: GameConfig.STATS_TEXT_COLOR,
      align: "left",
      backgroundColor: GameConfig.STATS_BACKGROUND_COLOR,
      padding: {
        x: GameConfig.STATS_PADDING_X,
        y: GameConfig.STATS_PADDING_Y,
      },
    })
    .setOrigin(0);
};

/**
 * Creates the tutorial text for the start screen.
 *
 * Creates multi-line text with instructions for playing the game.
 * Font size and padding are scaled based on screen height.
 *
 * Performance: O(1)
 * - Time per call: ~0.02-0.03ms (creates 1 text object)
 * - Memory: ~250 bytes (text object with 2 lines)
 * - Main costs:
 *   • Font size calculation: O(1) - 2 function calls
 *   • Text creation: O(1) - single Phaser text object
 * - Called once per scene initialization
 */
export const createTutorialText = (
  scene: Phaser.Scene,
  scaleUtils: ScaleUtils,
  width: number,
  height: number
): Phaser.GameObjects.Text => {
  const scaledFontSize = scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_FONT_SIZE, height);
  const scaledStrokeThickness = scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_STROKE_THICKNESS, height);

  return scene.add.text(0, 0, ["Use arrow keys to move the snake", "Hold Shift to speed up"], {
    fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
    fontSize: scaledFontSize,
    color: GameConfig.TUTORIAL_TEXT_COLOR,
    stroke: GameConfig.TUTORIAL_STROKE_COLOR,
    strokeThickness: scaledStrokeThickness,
    align: "center",
    backgroundColor: GameConfig.TUTORIAL_BACKGROUND_COLOR,
    fixedWidth: width,
    fixedHeight: height,
    padding: scaleUtils.getTutorialTextPadding(height),
  });
};

/**
 * Creates the game over text.
 *
 * Creates "GAME OVER" text displayed when the player loses.
 * Font size and padding are scaled based on screen height.
 *
 * Performance: O(1)
 * - Time per call: ~0.02ms (creates 1 text object)
 * - Memory: ~200 bytes (text object)
 * - Main costs:
 *   • Font size calculation: O(1) - 2 function calls
 *   • Text creation: O(1) - single Phaser text object
 * - Called once per scene initialization
 */
export const createGameOverText = (
  scene: Phaser.Scene,
  scaleUtils: ScaleUtils,
  width: number,
  height: number
): Phaser.GameObjects.Text => {
  const scaledFontSize = scaleUtils.getScaledFontSize(GameConfig.GAMEOVER_FONT_SIZE, height);
  const scaledStrokeThickness = scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_STROKE_THICKNESS, height);

  return scene.add.text(0, 0, "GAME OVER", {
    fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
    fontSize: scaledFontSize,
    color: GameConfig.TUTORIAL_TEXT_COLOR,
    stroke: GameConfig.TUTORIAL_STROKE_COLOR,
    strokeThickness: scaledStrokeThickness,
    align: "center",
    backgroundColor: GameConfig.STATS_BACKGROUND_COLOR,
    fixedWidth: width,
    fixedHeight: height,
    padding: scaleUtils.getGameOverTextPadding(height),
  });
};

/**
 * Creates the error requirement text.
 *
 * Creates multi-line error message displayed when no input devices are detected.
 * Font size and padding are scaled based on screen height.
 *
 * Performance: O(1)
 * - Time per call: ~0.02-0.03ms (creates 1 text object)
 * - Memory: ~300 bytes (text object with 5 lines)
 * - Main costs:
 *   • Font size calculation: O(1) - 2 function calls
 *   • Text creation: O(1) - single Phaser text object
 * - Called once per scene initialization (only if no input detected)
 */
export const createErrorText = (
  scene: Phaser.Scene,
  scaleUtils: ScaleUtils,
  width: number,
  height: number
): Phaser.GameObjects.Text => {
  const scaledFontSize = scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_FONT_SIZE, height);
  const scaledStrokeThickness = scaleUtils.getScaledFontSize(GameConfig.TUTORIAL_STROKE_THICKNESS, height);

  return scene.add.text(
    0,
    0,
    [
      "Input Device Required",
      "",
      "This game requires either:",
      "• Touch input (touchscreen), or",
      "• Physical keyboard with arrow keys and Shift",
    ],
    {
      fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
      fontSize: scaledFontSize,
      color: GameConfig.TUTORIAL_TEXT_COLOR,
      stroke: GameConfig.TUTORIAL_STROKE_COLOR,
      strokeThickness: scaledStrokeThickness,
      align: "center",
      backgroundColor: GameConfig.TUTORIAL_BACKGROUND_COLOR,
      fixedWidth: width,
      fixedHeight: height,
      padding: scaleUtils.getErrorTextPadding(height),
    }
  );
};
