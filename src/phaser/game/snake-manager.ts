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
        (startX - i) * gridUtils.cellWidth +
          GameConfig.SNAKE_SEGMENT_PADDING / 2,
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
 */
export const isWithinBounds = (
  x: number,
  y: number,
  gridUtils: GridUtils
): boolean => {
  const maxX = GameConfig.GRID_COLUMNS * gridUtils.cellWidth;
  const maxY = GameConfig.GRID_ROWS * gridUtils.cellHeight;
  return x >= 0 && x < maxX && y >= 0 && y < maxY;
};

/**
 * Checks if the new position collides with the snake's body.
 */
export const checkSelfCollision = (
  snake: Phaser.GameObjects.Rectangle[],
  newHeadCol: number,
  newHeadRow: number,
  gridUtils: GridUtils
): boolean => {
  for (const segment of snake) {
    const [segmentCol, segmentRow] = gridUtils.getColRowFromXY(
      segment.x,
      segment.y
    );
    if (newHeadCol === segmentCol && newHeadRow === segmentRow) {
      return true;
    }
  }
  return false;
};

/**
 * Checks if the new position collides with food.
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
