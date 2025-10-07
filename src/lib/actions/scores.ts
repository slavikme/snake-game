"use server";

import {
  createScore,
  getLeaderboard as getLeaderboardQuery,
} from "@/lib/db/queries";
import type { Score, User } from "@/lib/db/schema";

type SaveScoreResult =
  | {
      success: true;
      score: Score;
      error?: never;
    }
  | {
      success: false;
      error: string;
      score?: never;
    };

export const saveScore = async (
  userId: string,
  scoreData: {
    score: number;
    level: number;
    speedMs: number;
    apples: number;
  }
): Promise<SaveScoreResult> => {
  try {
    if (!userId || typeof userId !== "string") {
      return { success: false, error: "Invalid user ID" };
    }

    // Validate score data
    if (
      typeof scoreData.score !== "number" ||
      typeof scoreData.level !== "number" ||
      typeof scoreData.speedMs !== "number" ||
      typeof scoreData.apples !== "number"
    ) {
      return { success: false, error: "Invalid score data" };
    }

    if (scoreData.score < 0 || scoreData.apples < 0) {
      return { success: false, error: "Score and apples cannot be negative" };
    }

    // Create the score
    const newScore = await createScore({
      userId,
      score: scoreData.score,
      level: scoreData.level,
      speedMs: scoreData.speedMs,
      apples: scoreData.apples,
    });

    return { success: true, score: newScore };
  } catch (error) {
    console.error("Error saving score:", error);
    return { success: false, error: "Failed to save score" };
  }
};

type GetLeaderboardResult =
  | {
      success: true;
      scores: (Score & { user: User })[];
      error?: never;
    }
  | {
      success: false;
      error: string;
      scores?: never;
    };

export const getLeaderboard = async (
  limit: number = 100,
  userId?: string
): Promise<GetLeaderboardResult> => {
  try {
    if (limit <= 0 || limit > 1000) {
      return {
        success: false,
        error: "Invalid limit. Must be between 1 and 1000",
      };
    }

    const leaderboardScores = await getLeaderboardQuery(limit, userId);

    return { success: true, scores: leaderboardScores };
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return { success: false, error: "Failed to fetch leaderboard" };
  }
};
