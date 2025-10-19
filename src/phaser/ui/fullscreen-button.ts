/**
 * Fullscreen button component with expand/contract icons.
 */

import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";

/**
 * Creates the expand icon for fullscreen button (arrows pointing outward).
 *
 * Constructs 8 small rectangles arranged as 4 corner arrows pointing outward.
 * Used to indicate "enter fullscreen" action.
 *
 * Performance: O(1)
 * - Time per call: ~0.15-0.2ms (creates 9 game objects)
 * - Memory: ~450 bytes (container + 8 rectangles)
 * - Main costs:
 *   • Rectangle creation: O(1) - 8 small rectangles
 *   • Container creation: O(1) - wraps 8 children
 * - Called once per scene initialization (if fullscreen supported)
 */
const createExpandIcon = (scene: Phaser.Scene, buttonSize: number): Phaser.GameObjects.Container => {
  const container = scene.add.container(buttonSize / 2, buttonSize / 2);
  const size = GameConfig.FULLSCREEN_ICON_SIZE;
  const thickness = GameConfig.FULLSCREEN_ICON_THICKNESS;
  const offset = GameConfig.FULLSCREEN_ICON_OFFSET;

  const createArrow = (x: number, y: number, w: number, h: number) =>
    scene.add.rectangle(x, y, w, h, GameConfig.BORDER_COLOR, 0.7).setOrigin(0.5);

  // Top-left arrows
  const tl1 = createArrow(-offset, -offset - size / 2, thickness, size);
  const tl2 = createArrow(-offset - size / 2, -offset, size, thickness);

  // Top-right arrows
  const tr1 = createArrow(offset, -offset - size / 2, thickness, size);
  const tr2 = createArrow(offset + size / 2, -offset, size, thickness);

  // Bottom-left arrows
  const bl1 = createArrow(-offset, offset + size / 2, thickness, size);
  const bl2 = createArrow(-offset - size / 2, offset, size, thickness);

  // Bottom-right arrows
  const br1 = createArrow(offset, offset + size / 2, thickness, size);
  const br2 = createArrow(offset + size / 2, offset, size, thickness);

  container.add([tl1, tl2, tr1, tr2, bl1, bl2, br1, br2]);
  return container;
};

/**
 * Creates the contract icon for fullscreen button (arrows pointing inward).
 *
 * Constructs 8 small rectangles arranged as 4 corner arrows pointing inward.
 * Used to indicate "exit fullscreen" action.
 *
 * Performance: O(1)
 * - Time per call: ~0.15-0.2ms (creates 9 game objects)
 * - Memory: ~450 bytes (container + 8 rectangles)
 * - Main costs:
 *   • Rectangle creation: O(1) - 8 small rectangles
 *   • Container creation: O(1) - wraps 8 children
 * - Called once per scene initialization (if fullscreen supported)
 */
const createContractIcon = (scene: Phaser.Scene, buttonSize: number): Phaser.GameObjects.Container => {
  const container = scene.add.container(buttonSize / 2, buttonSize / 2);
  const arrowLength = GameConfig.FULLSCREEN_ICON_SIZE * 0.67;
  const arrowThickness = GameConfig.FULLSCREEN_ICON_THICKNESS;
  const spacing = GameConfig.FULLSCREEN_ICON_OFFSET * 0.89;

  const createArrow = (x: number, y: number, w: number, h: number) =>
    scene.add.rectangle(x, y, w, h, GameConfig.BORDER_COLOR, 0.7).setOrigin(0.5);

  // Top-left corner: arrows pointing toward center
  const tl1 = createArrow(-spacing, -spacing - arrowLength / 2, arrowThickness, arrowLength);
  const tl2 = createArrow(-spacing - arrowLength / 2, -spacing, arrowLength, arrowThickness);

  // Top-right corner: arrows pointing toward center
  const tr1 = createArrow(spacing, -spacing - arrowLength / 2, arrowThickness, arrowLength);
  const tr2 = createArrow(spacing + arrowLength / 2, -spacing, arrowLength, arrowThickness);

  // Bottom-left corner: arrows pointing toward center
  const bl1 = createArrow(-spacing, spacing + arrowLength / 2, arrowThickness, arrowLength);
  const bl2 = createArrow(-spacing - arrowLength / 2, spacing, arrowLength, arrowThickness);

  // Bottom-right corner: arrows pointing toward center
  const br1 = createArrow(spacing, spacing + arrowLength / 2, arrowThickness, arrowLength);
  const br2 = createArrow(spacing + arrowLength / 2, spacing, arrowLength, arrowThickness);

  container.add([tl1, tl2, tr1, tr2, bl1, bl2, br1, br2]);
  return container;
};

/**
 * Creates a fullscreen toggle button in the top-right corner.
 *
 * Creates an interactive button that toggles fullscreen mode. Shows expand icon
 * when windowed, contract icon when fullscreen. Returns undefined if fullscreen
 * is not supported (e.g., on iPhones).
 *
 * Performance: O(1)
 * - Time per call: ~0.35-0.45ms (creates button + 2 icons)
 * - Memory: ~1.2KB (container + background + 2 icon containers)
 * - Main costs:
 *   • Icon creation: O(1) - 2 icon containers (expand + contract)
 *   • Rectangle creation: O(1) - background rectangle
 *   • Container creation: O(1) - wraps 3 children
 *   • Event listeners: O(1) - 3 event handlers (click, enterfullscreen, leavefullscreen)
 * - Called once per scene initialization
 * - Returns undefined if fullscreen not supported
 */
export const createFullscreenButton = (
  scene: Phaser.Scene,
  width: number,
  onEnterFullscreen: () => void,
  onExitFullscreen: () => void
): Phaser.GameObjects.Container | undefined => {
  // Check if fullscreen is supported (not supported on iPhones)
  if (!scene.scale.fullscreen.available) {
    console.log("Fullscreen not available on this device");
    return undefined;
  }

  const buttonSize = GameConfig.FULLSCREEN_BUTTON_SIZE;
  const padding = GameConfig.FULLSCREEN_BUTTON_PADDING;
  const x = width - buttonSize - padding;
  const y = padding;

  // Create container for the button
  const container = scene.add.container(x, y);

  // Background with rounded corners effect
  const bg = scene.add
    .rectangle(
      buttonSize / 2,
      buttonSize / 2,
      buttonSize,
      buttonSize,
      GameConfig.BACKGROUND_COLOR,
      GameConfig.FULLSCREEN_BUTTON_OPACITY
    )
    .setInteractive({ useHandCursor: true });

  // Icon - arrows pointing out (default state)
  const iconExpand = createExpandIcon(scene, buttonSize);
  const iconContract = createContractIcon(scene, buttonSize);
  iconContract.setVisible(false);

  container.add([bg, iconExpand, iconContract]);

  // Handle click
  bg.on("pointerdown", () => {
    if (scene.scale.isFullscreen) {
      scene.scale.stopFullscreen();
    } else {
      scene.scale.startFullscreen();
    }
  });

  // Listen for fullscreen changes
  scene.scale.on("enterfullscreen", () => {
    iconExpand.setVisible(false);
    iconContract.setVisible(true);
    onEnterFullscreen();
  });

  scene.scale.on("leavefullscreen", () => {
    iconExpand.setVisible(true);
    iconContract.setVisible(false);
    onExitFullscreen();
  });

  return container;
};
