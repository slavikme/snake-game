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
 */
export const createVirtualJoystick = (
  scene: Phaser.Scene,
  width: number,
  height: number
): VirtualJoystick => {
  return new VirtualJoystick(scene, {
    radius: GameConfig.JOYSTICK_RADIUS,
    x:
      width -
      GameConfig.JOYSTICK_RADIUS -
      GameConfig.JOYSTICK_MARGIN,
    y:
      height -
      GameConfig.JOYSTICK_RADIUS -
      GameConfig.JOYSTICK_MARGIN,
    dir: "4dir",
    base: scene.add.circle(
      0,
      0,
      GameConfig.JOYSTICK_RADIUS,
      GameConfig.BORDER_COLOR,
      GameConfig.JOYSTICK_BASE_OPACITY
    ),
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
 */
export const createControlKeys = (
  cursorsKeyboard: Phaser.Types.Input.Keyboard.CursorKeys | undefined,
  joystick: VirtualJoystick | undefined
): ControlKey[] => {
  return [
    {
      isActive: () =>
        cursorsKeyboard?.left?.isDown || joystick?.left || false,
      direction: "left" as Direction,
      opposite: "right" as Direction,
      isHandled: false,
    },
    {
      isActive: () =>
        cursorsKeyboard?.right?.isDown || joystick?.right || false,
      direction: "right" as Direction,
      opposite: "left" as Direction,
      isHandled: false,
    },
    {
      isActive: () =>
        cursorsKeyboard?.up?.isDown || joystick?.up || false,
      direction: "up" as Direction,
      opposite: "down" as Direction,
      isHandled: false,
    },
    {
      isActive: () =>
        cursorsKeyboard?.down?.isDown || joystick?.down || false,
      direction: "down" as Direction,
      opposite: "up" as Direction,
      isHandled: false,
    },
  ];
};

/**
 * Processes control input and returns the next direction if changed.
 */
export const processControlInput = (
  controlKeys: ControlKey[],
  currentDirection: Direction
): Direction | null => {
  for (const controlKey of controlKeys) {
    if (controlKey.isActive()) {
      if (
        !controlKey.isHandled &&
        currentDirection !== controlKey.direction &&
        currentDirection !== controlKey.opposite
      ) {
        controlKey.isHandled = true;
        return controlKey.direction;
      }
    } else {
      controlKey.isHandled = false;
    }
  }
  return null;
};

