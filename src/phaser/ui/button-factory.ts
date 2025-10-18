/**
 * Button factory for creating styled game buttons.
 */

import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";
import type { ScaleUtils } from "@/phaser/utils/scale-utils";

/**
 * Creates a styled button with green gradient and bevel effects.
 *
 * @param scene - Phaser scene to create button in
 * @param text - Button label text
 * @param onClick - Click handler receiving pointer event and button container
 * @param options - Optional customization (position, size, fontSize)
 * @returns Phaser container with interactive button
 */
export const createGreenButton = (
  scene: Phaser.Scene,
  text: string,
  onClick: (
    e: Phaser.Input.Pointer,
    button: Phaser.GameObjects.Container
  ) => void,
  {
    x = 0,
    y = 0,
    width = GameConfig.BUTTON_WIDTH,
    height = GameConfig.BUTTON_HEIGHT,
    fontSize = GameConfig.BUTTON_FONT_SIZE,
    strokeThickness = GameConfig.BUTTON_TEXT_STROKE_THICKNESS,
  }: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fontSize?: string | number;
    strokeThickness?: number;
  } = {}
): Phaser.GameObjects.Container => {
  const cornerRadius = height * GameConfig.BUTTON_CORNER_RADIUS_FACTOR;
  const button = scene.add
    .container(x, y, [
      // Main button background
      scene.add
        .graphics()
        .fillStyle(GameConfig.BUTTON_PRIMARY_COLOR)
        .fillRoundedRect(-width / 2, -height / 2, width, height, cornerRadius),
      // Top highlight bevel
      scene.add
        .graphics()
        .fillStyle(GameConfig.BUTTON_HIGHLIGHT_COLOR, 0.4)
        .fillRoundedRect(
          -width / 2 + 5,
          -height / 2 + 5,
          width - 10,
          height / 3,
          cornerRadius * 0.8
        ),
      // Bottom shadow bevel
      scene.add
        .graphics()
        .fillStyle(GameConfig.BUTTON_SHADOW_COLOR, 0.3)
        .fillRoundedRect(
          -width / 2 + 5,
          height / 6 - 5,
          width - 10,
          height / 3,
          cornerRadius * 0.8
        ),
      // Border
      scene.add
        .graphics()
        .lineStyle(
          GameConfig.BUTTON_BORDER_THICKNESS,
          GameConfig.BUTTON_BORDER_COLOR
        )
        .strokeRoundedRect(
          -width / 2,
          -height / 2,
          width,
          height,
          cornerRadius
        ),
      // Text
      scene.add
        .text(0, 0, text, {
          fontFamily: GameConfig.TUTORIAL_FONT_FAMILY,
          fontSize,
          color: GameConfig.BUTTON_TEXT_COLOR,
          stroke: GameConfig.BUTTON_TEXT_STROKE_COLOR,
          strokeThickness,
        })
        .setOrigin(0.5),
    ])
    .setSize(width, height)
    .setInteractive({ useHandCursor: true })
    .on("pointerdown", (e: Phaser.Input.Pointer) => onClick(e, button));
  return button;
};

/**
 * Updates a button's scale and text font size to prevent pixelation.
 *
 * @param button - The button container to update
 * @param currentHeight - Current screen height
 * @param scaleUtils - Scale utility functions
 */
export const updateButtonScale = (
  button: Phaser.GameObjects.Container,
  currentHeight: number,
  scaleUtils: ScaleUtils
): void => {
  const scale = scaleUtils.getScaleFactor(currentHeight);

  // Get the text element (5th child, index 4)
  const children = button.getAll();
  const buttonText = children[4] as Phaser.GameObjects.Text;

  if (buttonText && buttonText.active) {
    const scaledFontSize = scaleUtils.getScaledFontSize(
      GameConfig.BUTTON_FONT_SIZE,
      currentHeight
    );
    const scaledStrokeThickness = scaleUtils.getScaledFontSize(
      GameConfig.BUTTON_TEXT_STROKE_THICKNESS,
      currentHeight
    );

    // Reset text scale to 1 before updating font size
    // This prevents double scaling (once from container, once from fontSize)
    buttonText.setScale(1 / scale);

    buttonText.setStyle({
      fontSize: scaledFontSize,
      strokeThickness: scaledStrokeThickness,
    });
  }

  // Scale the button container (graphics scale, text compensated above)
  button.setScale(scale);
};
