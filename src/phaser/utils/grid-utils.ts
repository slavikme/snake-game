/**
 * Grid coordinate conversion utilities.
 * Provides functions to convert between pixel coordinates and grid coordinates.
 */

export type GridCoordinates = [col: number, row: number];
export type PixelCoordinates = [x: number, y: number];

/**
 * Creates grid utility functions for a specific cell size.
 * 
 * @param cellWidth - Width of each grid cell in pixels
 * @param cellHeight - Height of each grid cell in pixels
 * @returns Object with grid conversion functions
 */
export const createGridUtils = (cellWidth: number, cellHeight: number) => {
  /**
   * Converts pixel X coordinate to grid column.
   */
  const getColFromX = (x: number): number => Math.floor(x / cellWidth);

  /**
   * Converts pixel Y coordinate to grid row.
   */
  const getRowFromY = (y: number): number => Math.floor(y / cellHeight);

  /**
   * Converts pixel coordinates to grid coordinates.
   */
  const getColRowFromXY = (x: number, y: number): GridCoordinates => [
    getColFromX(x),
    getRowFromY(y),
  ];

  /**
   * Converts grid column to pixel X coordinate.
   */
  const getXFromCol = (col: number): number => col * cellWidth;

  /**
   * Converts grid row to pixel Y coordinate.
   */
  const getYFromRow = (row: number): number => row * cellHeight;

  /**
   * Converts grid coordinates to pixel coordinates.
   */
  const getXYFromColRow = (col: number, row: number): PixelCoordinates => [
    getXFromCol(col),
    getYFromRow(row),
  ];

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

