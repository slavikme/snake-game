/**
 * Grid coordinate conversion utilities.
 * Provides functions to convert between pixel coordinates and grid coordinates.
 */

export type GridCoordinates = [col: number, row: number];
export type PixelCoordinates = [x: number, y: number];

/**
 * Creates grid utility functions for a specific cell size.
 *
 * Returns an object with methods to convert between pixel and grid coordinates.
 * All conversion functions are O(1) operations.
 *
 * Performance: Factory function O(1)
 * - Time per call: <0.001ms (creates closure)
 * - Memory: ~100 bytes (closure state)
 * - Called once per scene initialization and once per resize
 *
 * @param cellWidth - Width of each grid cell in pixels
 * @param cellHeight - Height of each grid cell in pixels
 * @returns Object with grid conversion functions
 */
export const createGridUtils = (cellWidth: number, cellHeight: number) => {
  /**
   * Converts pixel X coordinate to grid column.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single division + floor)
   * - Memory: Negligible (no allocations)
   * - Called frequently during collision detection and position updates
   */
  const getColFromX = (x: number): number => Math.floor(x / cellWidth);

  /**
   * Converts pixel Y coordinate to grid row.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single division + floor)
   * - Memory: Negligible (no allocations)
   * - Called frequently during collision detection and position updates
   */
  const getRowFromY = (y: number): number => Math.floor(y / cellHeight);

  /**
   * Converts pixel coordinates to grid coordinates.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (2 function calls)
   * - Memory: 16 bytes (tuple allocation)
   * - Called frequently during collision detection and position updates
   */
  const getColRowFromXY = (x: number, y: number): GridCoordinates => [getColFromX(x), getRowFromY(y)];

  /**
   * Converts grid column to pixel X coordinate.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single multiplication)
   * - Memory: Negligible (no allocations)
   * - Called during food spawning and position updates
   */
  const getXFromCol = (col: number): number => col * cellWidth;

  /**
   * Converts grid row to pixel Y coordinate.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (single multiplication)
   * - Memory: Negligible (no allocations)
   * - Called during food spawning and position updates
   */
  const getYFromRow = (row: number): number => row * cellHeight;

  /**
   * Converts grid coordinates to pixel coordinates.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (2 function calls)
   * - Memory: 16 bytes (tuple allocation)
   * - Called during food spawning and position updates
   */
  const getXYFromColRow = (col: number, row: number): PixelCoordinates => [getXFromCol(col), getYFromRow(row)];

  return {
    getColFromX,
    getRowFromY,
    getColRowFromXY,
    getXFromCol,
    getYFromRow,
    getXYFromColRow,
    cellWidth,
    cellHeight,
  };
};

export type GridUtils = ReturnType<typeof createGridUtils>;
