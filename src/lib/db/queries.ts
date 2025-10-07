"use server";

import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { users, auth, scores, User, Auth, Score, NewScore } from "./schema";

/**
 * Get user by ID
 */
export const getUserById = async (userId: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] ?? null;
};

/**
 * Get user by auth token
 */
export const getUserByAuthToken = async (
  token: string
): Promise<User | null> => {
  const result = await db
    .select()
    .from(users)
    .innerJoin(auth, eq(auth.userId, users.id))
    .where(eq(auth.token, token))
    .limit(1);

  return result[0]?.users ?? null;
};

/**
 * Check if a name already exists
 */
export const isNameExists = async (name: string): Promise<boolean> => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.name, name))
    .limit(1);

  return result.length > 0;
};

/**
 * Register a new user
 * Creates both user and auth records, returns auth token with user data
 */
export const registerUser = async (
  name: string
): Promise<Auth & { user: User }> => {
  // Start a transaction to ensure both records are created
  return await db.transaction(async (tx) => {
    // Create user
    const [newUser] = await tx.insert(users).values({ name }).returning();

    // Create auth token for the user and fetch it with user data
    const [newAuth] = await tx
      .insert(auth)
      .values({ userId: newUser.id })
      .returning();

    return { ...newAuth, user: newUser };
  });
};

/**
 * Get leaderboard with top scores
 * @param limit - Maximum number of scores to retrieve (default: 100)
 * @param userId - Optional user ID to filter scores by specific user
 */
export const getLeaderboard = async (
  limit: number = 100,
  userId?: string
): Promise<(Score & { user: User })[]> => {
  const baseQuery = db
    .select()
    .from(scores)
    .innerJoin(users, eq(scores.userId, users.id))
    .orderBy(desc(scores.score))
    .limit(limit);

  const result = userId
    ? await baseQuery.where(eq(scores.userId, userId))
    : await baseQuery;

  return result.map((row) => ({
    ...row.scores,
    user: row.users,
  }));
};

/**
 * Create a new score entry
 * @param scoreData - Score data to insert
 */
export const createScore = async (
  scoreData: Omit<NewScore, "id" | "createdAt">
): Promise<Score> => {
  const [newScore] = await db.insert(scores).values(scoreData).returning();

  return newScore;
};
