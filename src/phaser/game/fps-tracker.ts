/**
 * FPS tracking utilities for performance monitoring.
 */

import * as GameConfig from "@/phaser/config/game-config";

/**
 * Creates an FPS tracker that calculates frames per second.
 */
export const createFpsTracker = () => {
  const frameTimestamps: number[] = [];
  let calculatedFps = 0;

  /**
   * Updates FPS calculation with a new frame timestamp.
   */
  const update = (): void => {
    const currentTime = performance.now();
    frameTimestamps.push(currentTime);

    // Keep only the last second of timestamps
    const oneSecondAgo = currentTime - GameConfig.FPS_SAMPLE_DURATION_MS;
    while (
      frameTimestamps.length > 0 &&
      frameTimestamps[0] < oneSecondAgo
    ) {
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
   */
  const getFps = (): number => calculatedFps;

  return {
    update,
    getFps,
  };
};

export type FpsTracker = ReturnType<typeof createFpsTracker>;

