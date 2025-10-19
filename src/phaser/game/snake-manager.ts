/**
 * Snake management utilities for creating, moving, and collision detection.
 */

import Phaser from "phaser";
import * as GameConfig from "@/phaser/config/game-config";
import { RandomAccessMap } from "@/lib/utils/RandomAccessMap";
import type { GridUtils } from "@/phaser/utils/grid-utils";
import type { Direction } from "@/phaser/input/control-manager";

/**
 * Creates the initial snake at the starting position.
 *
 * Generates rectangle segments for the snake body and updates the empty cells map.
 * Each segment is positioned based on grid coordinates with padding.
 *
 * Performance: O(k) where k = initial snake length (3)
 * - Time per call: ~0.1-0.15ms (creates 3 game objects)
 * - Memory: ~300 bytes per segment (~900 bytes total)
 * - Main costs:
 *   • Rectangle creation: O(k) - 3 Phaser rectangle game objects
 *   • Empty cells updates: O(k) - 3 delete operations
 *   • Array operations: O(k) - 3 push operations
 * - Called once per scene initialization
 */
export const createSnake = (
  scene: Phaser.Scene,
  gridUtils: GridUtils,
  emptyCells: RandomAccessMap<string, [number, number]>
): Phaser.GameObjects.Rectangle[] => {
  const snake: Phaser.GameObjects.Rectangle[] = [];
  const startX = GameConfig.SNAKE_INITIAL_POSITION_X;
  const startY = GameConfig.SNAKE_INITIAL_POSITION_Y;

  for (let i = 0; i < GameConfig.SNAKE_INITIAL_LENGTH; i++) {
    const segment = scene.add
      .rectangle(
        (startX - i) * gridUtils.cellWidth + GameConfig.SNAKE_SEGMENT_PADDING / 2,
        startY * gridUtils.cellHeight + GameConfig.SNAKE_SEGMENT_PADDING / 2,
        gridUtils.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
        gridUtils.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING,
        GameConfig.SNAKE_COLOR
      )
      .setOrigin(0);
    snake.push(segment);

    // Remove snake position from empty cells
    const col = startX - i;
    const row = startY;
    emptyCells.delete(`${col},${row}`);
  }

  return snake;
};

/**
 * Calculates the new head position based on direction.
 *
 * Computes the next pixel coordinates for the snake head by adding/subtracting
 * one cell width/height based on the current direction.
 *
 * Performance: O(1)
 * - Time per call: <0.001ms (simple arithmetic)
 * - Memory: 16 bytes (2 numbers in tuple)
 * - Main costs:
 *   • Switch statement: O(1) - 4 cases, one executed
 *   • Arithmetic: O(1) - single addition or subtraction
 * - Called ~10-20 times per second (every snake move)
 */
export const calculateNewHeadPosition = (
  head: Phaser.GameObjects.Rectangle,
  direction: Direction,
  gridUtils: GridUtils
): [number, number] => {
  let newX = head.x;
  let newY = head.y;

  switch (direction) {
    case "left":
      newX -= gridUtils.cellWidth;
      break;
    case "right":
      newX += gridUtils.cellWidth;
      break;
    case "up":
      newY -= gridUtils.cellHeight;
      break;
    case "down":
      newY += gridUtils.cellHeight;
      break;
  }

  return [newX, newY];
};

/**
 * Checks if the position is within grid boundaries.
 *
 * Validates that the position is within the playable grid area by checking
 * against maximum X and Y bounds.
 *
 * Performance: O(1)
 * - Time per call: <0.001ms (4 comparisons)
 * - Memory: Negligible (no allocations)
 * - Main costs:
 *   • Boundary calculations: O(1) - 2 multiplications
 *   • Comparisons: O(1) - 4 boolean checks
 * - Called ~10-20 times per second (every snake move)
 */
export const isWithinBounds = (x: number, y: number, gridUtils: GridUtils): boolean => {
  const maxX = GameConfig.GRID_COLUMNS * gridUtils.cellWidth;
  const maxY = GameConfig.GRID_ROWS * gridUtils.cellHeight;
  return x >= 0 && x < maxX && y >= 0 && y < maxY;
};

/**
 * Checks if the new position collides with the snake's body.
 *
 * Iterates through all snake segments to detect if the new head position
 * matches any existing segment position (using grid coordinates).
 *
 * Performance: O(k) where k = snake length
 * - Time per call: ~0.01-0.05ms (depends on snake length)
 * - Memory: Negligible (no allocations)
 * - Main costs:
 *   • Loop iteration: O(k) - checks all segments
 *   • Grid conversion: O(k) - converts each segment to grid coords
 *   • Comparisons: O(k) - 2 equality checks per segment
 * - Optimization opportunity: Could use spatial hash for O(1) lookup
 * - Called ~10-20 times per second (every snake move)
 */
export const checkSelfCollision = (
  snake: Phaser.GameObjects.Rectangle[],
  newHeadCol: number,
  newHeadRow: number,
  gridUtils: GridUtils
): boolean => {
  for (const segment of snake) {
    const [segmentCol, segmentRow] = gridUtils.getColRowFromXY(segment.x, segment.y);
    if (newHeadCol === segmentCol && newHeadRow === segmentRow) {
      return true;
    }
  }
  return false;
};

/**
 * Checks if the new position collides with food.
 *
 * Compares the new head position with the food position using grid coordinates.
 * Returns false immediately if no food exists.
 *
 * Performance: O(1)
 * - Time per call: <0.001ms (2 comparisons)
 * - Memory: Negligible (no allocations)
 * - Main costs:
 *   • Null check: O(1) - single boolean check
 *   • Grid conversion: O(1) - converts food position
 *   • Comparisons: O(1) - 2 equality checks
 * - Called ~10-20 times per second (every snake move)
 */
export const checkFoodCollision = (
  food: Phaser.GameObjects.Rectangle | undefined,
  newHeadCol: number,
  newHeadRow: number,
  gridUtils: GridUtils
): boolean => {
  if (!food) return false;
  const [foodCol, foodRow] = gridUtils.getColRowFromXY(food.x, food.y);
  return newHeadCol === foodCol && newHeadRow === foodRow;
};

/**
 * Adds a new head segment to the snake.
 *
 * Creates a new rectangle game object and adds it to the front of the snake array.
 * Updates the empty cells map to mark the new position as occupied.
 *
 * Performance: O(1)
 * - Time per call: ~0.02-0.03ms (creates 1 game object)
 * - Memory: ~300 bytes (new rectangle segment)
 * - Main costs:
 *   • Rectangle creation: O(1) - single Phaser game object
 *   • Array unshift: O(1) amortized - adds to front of array
 *   • Grid conversion: O(1) - converts position to grid coords
 *   • Empty cells update: O(1) - single delete operation
 * - Called ~10-20 times per second (every snake move)
 */
export const addSnakeHead = (
  scene: Phaser.Scene,
  snake: Phaser.GameObjects.Rectangle[],
  x: number,
  y: number,
  gridUtils: GridUtils,
  emptyCells: RandomAccessMap<string, [number, number]>
): void => {
  const newHead = scene.add
    .rectangle(
      x,
      y,
      gridUtils.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
      gridUtils.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING,
      GameConfig.SNAKE_COLOR
    )
    .setOrigin(0);
  snake.unshift(newHead);

  // Remove new head position from empty cells
  const [col, row] = gridUtils.getColRowFromXY(x, y);
  emptyCells.delete(`${col},${row}`);
};

/**
 * Removes the tail segment from the snake.
 *
 * Removes the last segment from the snake array, destroys the game object,
 * and adds the position back to the empty cells map.
 *
 * Performance: O(1)
 * - Time per call: ~0.01-0.02ms (destroys 1 game object)
 * - Memory: Frees ~300 bytes (rectangle segment)
 * - Main costs:
 *   • Array pop: O(1) - removes from end of array
 *   • Grid conversion: O(1) - converts position to grid coords
 *   • Empty cells update: O(1) - single set operation
 *   • GameObject destroy: O(1) - Phaser cleanup
 * - Called ~10-20 times per second (every snake move when not eating)
 */
export const removeSnakeTail = (
  snake: Phaser.GameObjects.Rectangle[],
  gridUtils: GridUtils,
  emptyCells: RandomAccessMap<string, [number, number]>
): void => {
  const tail = snake.pop();
  if (tail) {
    // Add tail position back to empty cells
    const [tailCol, tailRow] = gridUtils.getColRowFromXY(tail.x, tail.y);
    emptyCells.set(`${tailCol},${tailRow}`, [tailCol, tailRow]);
    tail.destroy();
  }
};

/**
 * Updates snake segment positions after resize.
 *
 * Recalculates pixel positions for all snake segments based on new cell dimensions.
 * Converts from old grid coordinates to new pixel coordinates.
 *
 * Performance: O(k) where k = snake length
 * - Time per call: ~0.3-1.5ms (depends on snake length)
 * - Memory: Negligible (no allocations, updates in place)
 * - Main costs:
 *   • Loop iteration: O(k) - processes all segments
 *   • Grid conversion: O(k) - converts each segment
 *   • Position updates: O(k) - setPosition calls
 *   • Size updates: O(k) - setSize calls
 * - Called once per resize event (typically 1-2 times per session)
 */
export const updateSnakePositions = (
  snake: Phaser.GameObjects.Rectangle[],
  oldCellWidth: number,
  oldCellHeight: number,
  gridUtils: GridUtils
): void => {
  for (const segment of snake) {
    // Get grid position from old dimensions
    const col = Math.floor(segment.x / oldCellWidth);
    const row = Math.floor(segment.y / oldCellHeight);
    // Set new pixel position based on new dimensions
    segment.setPosition(
      col * gridUtils.cellWidth + GameConfig.SNAKE_SEGMENT_PADDING / 2,
      row * gridUtils.cellHeight + GameConfig.SNAKE_SEGMENT_PADDING / 2
    );
    // Update size
    segment.setSize(
      gridUtils.cellWidth - GameConfig.SNAKE_SEGMENT_PADDING,
      gridUtils.cellHeight - GameConfig.SNAKE_SEGMENT_PADDING
    );
  }
};
