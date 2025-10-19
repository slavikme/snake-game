/**
 * Control input manager for keyboard and virtual joystick.
 */

import Phaser from "phaser";
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick";
import * as GameConfig from "@/phaser/config/game-config";

export type Direction = "left" | "right" | "up" | "down";

export type ControlKey = {
  isActive: () => boolean;
  direction: Direction;
  opposite: Direction;
  isHandled: boolean;
};

/**
 * Creates a virtual joystick for touch controls.
 *
 * Instantiates a 4-directional joystick with base and thumb circles.
 * Positioned in the bottom-right corner with configurable styling.
 *
 * Performance: O(1)
 * - Time per call: ~0.05-0.1ms (creates 2 game objects + joystick instance)
 * - Memory: ~500 bytes (joystick instance + 2 circles)
 * - Main costs:
 *   • Circle creation: O(1) - 2 Phaser circle game objects
 *   • VirtualJoystick instantiation: O(1) - plugin initialization
 * - Called once per scene initialization
 */
export const createVirtualJoystick = (scene: Phaser.Scene, width: number, height: number): VirtualJoystick => {
  return new VirtualJoystick(scene, {
    radius: GameConfig.JOYSTICK_RADIUS,
    x: width - GameConfig.JOYSTICK_RADIUS - GameConfig.JOYSTICK_MARGIN,
    y: height - GameConfig.JOYSTICK_RADIUS - GameConfig.JOYSTICK_MARGIN,
    dir: "4dir",
    base: scene.add.circle(0, 0, GameConfig.JOYSTICK_RADIUS, GameConfig.BORDER_COLOR, GameConfig.JOYSTICK_BASE_OPACITY),
    thumb: scene.add.circle(
      0,
      0,
      GameConfig.JOYSTICK_RADIUS * GameConfig.JOYSTICK_THUMB_RADIUS_FACTOR,
      GameConfig.BORDER_COLOR,
      GameConfig.JOYSTICK_THUMB_OPACITY
    ),
  }).setVisible(false);
};

/**
 * Creates the sprint button for touch controls.
 *
 * Creates an interactive circle in the bottom-left corner that triggers
 * sprint mode when pressed and releases when lifted.
 *
 * Performance: O(1)
 * - Time per call: ~0.02-0.03ms (creates 1 game object + 2 event listeners)
 * - Memory: ~300 bytes (circle + event handlers)
 * - Main costs:
 *   • Circle creation: O(1) - single Phaser circle game object
 *   • Event listener registration: O(1) - 2 pointer event handlers
 * - Called once per scene initialization
 */
export const createSprintButton = (
  scene: Phaser.Scene,
  height: number,
  onPress: () => void,
  onRelease: () => void
): Phaser.GameObjects.Arc => {
  return scene.add
    .circle(
      GameConfig.SPRINT_BUTTON_X,
      height - GameConfig.SPRINT_BUTTON_X,
      GameConfig.SPRINT_BUTTON_RADIUS,
      GameConfig.BORDER_COLOR,
      GameConfig.SPRINT_BUTTON_OPACITY
    )
    .setOrigin(0.5)
    .setVisible(false)
    .setInteractive()
    .on("pointerdown", onPress)
    .on("pointerup", onRelease);
};

/**
 * Creates control key configurations for keyboard and joystick input.
 *
 * Returns an array of 4 control key objects (left, right, up, down) that
 * check both keyboard and joystick state. Each key tracks its handled state
 * to prevent repeated direction changes from held inputs.
 *
 * Performance: O(1)
 * - Time per call: <0.001ms (creates array of 4 objects)
 * - Memory: ~200 bytes (4 control key objects)
 * - Main costs:
 *   • Array creation: O(1) - 4 fixed elements
 *   • Closure creation: O(1) - 4 isActive closures
 * - Called once per scene initialization
 */
export const createControlKeys = (
  cursorsKeyboard: Phaser.Types.Input.Keyboard.CursorKeys | undefined,
  joystick: VirtualJoystick | undefined
): ControlKey[] => {
  return [
    {
      isActive: () => cursorsKeyboard?.left?.isDown || joystick?.left || false,
      direction: "left" as Direction,
      opposite: "right" as Direction,
      isHandled: false,
    },
    {
      isActive: () => cursorsKeyboard?.right?.isDown || joystick?.right || false,
      direction: "right" as Direction,
      opposite: "left" as Direction,
      isHandled: false,
    },
    {
      isActive: () => cursorsKeyboard?.up?.isDown || joystick?.up || false,
      direction: "up" as Direction,
      opposite: "down" as Direction,
      isHandled: false,
    },
    {
      isActive: () => cursorsKeyboard?.down?.isDown || joystick?.down || false,
      direction: "down" as Direction,
      opposite: "up" as Direction,
      isHandled: false,
    },
  ];
};

/**
 * Processes control input and returns the next direction if changed.
 *
 * Iterates through control keys to find active inputs. Validates that the new
 * direction is different from current and not opposite. Uses handled flag to
 * prevent repeated triggers from held keys.
 *
 * Performance: O(1) - fixed 4 iterations
 * - Time per call: <0.001ms (checks 4 control keys)
 * - Memory: Negligible (no allocations)
 * - Main costs:
 *   • Loop iteration: O(1) - always 4 iterations
 *   • isActive checks: O(1) - 4 function calls
 *   • Conditional checks: O(1) - 3 boolean comparisons per key
 * - Called 60 times per second (every frame)
 */
export const processControlInput = (controlKeys: ControlKey[], currentDirection: Direction): Direction | null => {
  for (const controlKey of controlKeys) {
    if (controlKey.isActive()) {
      if (!controlKey.isHandled && currentDirection !== controlKey.direction && currentDirection !== controlKey.opposite) {
        controlKey.isHandled = true;
        return controlKey.direction;
      }
    } else {
      controlKey.isHandled = false;
    }
  }
  return null;
};
