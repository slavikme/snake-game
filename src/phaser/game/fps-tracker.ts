/**
 * FPS tracking utilities for performance monitoring.
 */

import * as GameConfig from "@/phaser/config/game-config";

/**
 * Creates an FPS tracker that calculates frames per second.
 *
 * Returns an object with update() and getFps() methods for tracking frame rate.
 * Maintains a rolling window of frame timestamps for accurate FPS calculation.
 *
 * Performance: Factory function O(1)
 * - Time per call: <0.001ms (creates closure)
 * - Memory: ~100 bytes (closure state)
 * - Called once per scene initialization
 */
export const createFpsTracker = () => {
  const frameTimestamps: number[] = [];
  let calculatedFps = 0;

  /**
   * Updates FPS calculation with a new frame timestamp.
   *
   * Adds current timestamp to the rolling window and removes old timestamps
   * beyond the sample duration. Calculates FPS based on actual time span.
   *
   * Performance: O(k) where k = frames in 1 second (~60)
   * - Time per call: ~0.01-0.02ms (processes timestamp array)
   * - Memory: ~8 bytes per frame (~480 bytes for 60 frames)
   * - Main costs:
   *   • Array push: O(1) - adds timestamp
   *   • Array shift loop: O(k) - removes old timestamps (typically 0-2)
   *   • FPS calculation: O(1) - arithmetic operations
   * - Called 60 times per second (every frame)
   */
  const update = (): void => {
    const currentTime = performance.now();
    frameTimestamps.push(currentTime);

    // Keep only the last second of timestamps
    const oneSecondAgo = currentTime - GameConfig.FPS_SAMPLE_DURATION_MS;
    while (frameTimestamps.length > 0 && frameTimestamps[0] < oneSecondAgo) {
      frameTimestamps.shift();
    }

    // Calculate FPS based on actual time span between frames
    if (frameTimestamps.length >= 2) {
      const oldestTimestamp = frameTimestamps[0];
      const newestTimestamp = frameTimestamps[frameTimestamps.length - 1];
      const timeSpan = newestTimestamp - oldestTimestamp;

      if (timeSpan > 0) {
        // FPS = (number of frames - 1) / time span in seconds
        calculatedFps = ((frameTimestamps.length - 1) / timeSpan) * 1000;
      }
    }
  };

  /**
   * Gets the current calculated FPS.
   *
   * Returns the most recently calculated FPS value.
   *
   * Performance: O(1)
   * - Time per call: <0.001ms (returns cached value)
   * - Memory: Negligible (no allocations)
   * - Called 60 times per second (every frame for display)
   */
  const getFps = (): number => calculatedFps;

  return {
    update,
    getFps,
  };
};

export type FpsTracker = ReturnType<typeof createFpsTracker>;
