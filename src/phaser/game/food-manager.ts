/**
 * Food management utilities for spawning and updating food.
 */

import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";
import { RandomAccessMap } from "@/lib/utils/RandomAccessMap";
import type { GridUtils } from "@/phaser/utils/grid-utils";

/**
 * Spawns food at a random empty position on the board.
 */
export const spawnFood = (
  scene: Phaser.Scene,
  gridUtils: GridUtils,
  emptyCells: RandomAccessMap<string, [number, number]>,
  currentFood: Phaser.GameObjects.Rectangle | undefined
): Phaser.GameObjects.Rectangle | undefined => {
  // Add previous food position back to empty cells (if food existed)
  if (currentFood) {
    const [foodCol, foodRow] = gridUtils.getColRowFromXY(
      currentFood.x,
      currentFood.y
    );
    emptyCells.set(`${foodCol},${foodRow}`, [foodCol, foodRow]);
    currentFood.destroy();
  }

  // If the board is completely full, there's no space to spawn food
  if (emptyCells.size === 0) {
    // Snake has filled the entire board - player wins!
    return undefined;
  }

  // Get random empty cell using O(1) randomEntry() method
  const randomEntry = emptyCells.randomEntry();
  if (!randomEntry) return undefined;

  const [, [col, row]] = randomEntry;

  // Remove this cell from empty cells (food will occupy it)
  emptyCells.delete(`${col},${row}`);

  // Convert grid coordinates to pixel coordinates and add padding
  const [x, y] = gridUtils.getXYFromColRow(col, row);

  return scene.add
    .rectangle(
      x + GameConfig.SNAKE_SEGMENT_PADDING / 2,
      y + GameConfig.SNAKE_SEGMENT_PADDING / 2,
      gridUtils.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
      gridUtils.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING,
      GameConfig.FOOD_COLOR
    )
    .setOrigin(0);
};

/**
 * Updates food position after resize.
 */
export const updateFoodPosition = (
  food: Phaser.GameObjects.Rectangle,
  oldCellWidth: number,
  oldCellHeight: number,
  gridUtils: GridUtils
): void => {
  const col = Math.floor(food.x / oldCellWidth);
  const row = Math.floor(food.y / oldCellHeight);
  food.setPosition(
    col * gridUtils.cellWidth + GameConfig.SNAKE_SEGMENT_PADDING / 2,
    row * gridUtils.cellHeight + GameConfig.SNAKE_SEGMENT_PADDING / 2
  );
  food.setSize(
    gridUtils.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
    gridUtils.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING
  );
};
