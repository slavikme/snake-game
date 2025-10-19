/**
 * Food management utilities for spawning and updating food.
 */

import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";
import { RandomAccessMap } from "@/lib/utils/RandomAccessMap";
import type { GridUtils } from "@/phaser/utils/grid-utils";

/**
 * Spawns food at a random empty position on the board.
 *
 * Uses RandomAccessMap's O(1) randomEntry() to select an empty cell efficiently.
 * Destroys previous food if it exists and creates a new rectangle at the chosen position.
 *
 * Performance: O(1)
 * - Time per call: ~0.02-0.03ms (creates 1 game object)
 * - Memory: ~300 bytes (new rectangle), frees ~300 bytes if food existed
 * - Main costs:
 *   • Previous food cleanup: O(1) - destroy + emptyCells.set
 *   • Random cell selection: O(1) - RandomAccessMap.randomEntry()
 *   • Grid conversion: O(1) - converts grid to pixel coords
 *   • Rectangle creation: O(1) - single Phaser game object
 *   • Empty cells update: O(1) - single delete operation
 * - Called ~10-20 times per session (when food is eaten)
 */
export const spawnFood = (
  scene: Phaser.Scene,
  gridUtils: GridUtils,
  emptyCells: RandomAccessMap<string, [number, number]>,
  currentFood: Phaser.GameObjects.Rectangle | undefined
): Phaser.GameObjects.Rectangle | undefined => {
  // Add previous food position back to empty cells (if food existed)
  if (currentFood) {
    const [foodCol, foodRow] = gridUtils.getColRowFromXY(currentFood.x, currentFood.y);
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
 *
 * Recalculates pixel position for the food based on new cell dimensions.
 * Converts from old grid coordinates to new pixel coordinates.
 *
 * Performance: O(1)
 * - Time per call: ~0.01ms (updates 1 game object)
 * - Memory: Negligible (no allocations, updates in place)
 * - Main costs:
 *   • Grid conversion: O(1) - converts position to grid coords
 *   • Position update: O(1) - setPosition call
 *   • Size update: O(1) - setSize call
 * - Called once per resize event (typically 1-2 times per session)
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
  food.setSize(gridUtils.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING, gridUtils.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING);
};
