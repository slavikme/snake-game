"use server";

import { isNameExists, registerUser, getUserByAuthToken } from "@/lib/db/queries";
import type { User } from "@/lib/db/schema";

type CheckNameResult = { exists: boolean; error?: never } | { error: string; exists?: never };

type RegisterResult =
  | {
      success: true;
      token: string;
      user: User;
      createdAt: string;
      error?: never;
    }
  | {
      error: string;
      success?: never;
      token?: never;
      user?: never;
      createdAt?: never;
    };

type ValidateTokenResult =
  | {
      valid: true;
      user: User;
      error?: never;
    }
  | {
      valid: false;
      error: string;
      user?: never;
    };

export const checkNameAvailability = async (name: string): Promise<CheckNameResult> => {
  try {
    if (!name || typeof name !== "string") {
      return { error: "Name is required" };
    }

    const exists = await isNameExists(name);
    return { exists };
  } catch (error) {
    console.error("Error checking name:", error);
    return { error: "Failed to check name availability" };
  }
};

export const registerNewUser = async (name: string): Promise<RegisterResult> => {
  try {
    if (!name || typeof name !== "string") {
      return { error: "Name is required" };
    }

    // Register the user and get auth token
    const result = await registerUser(name);

    return {
      success: true,
      token: result.token,
      user: result.user,
      createdAt: result.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Error registering user:", error);
    return { error: "Failed to register user" };
  }
};

export const validateAuthToken = async (token: string): Promise<ValidateTokenResult> => {
  try {
    if (!token || typeof token !== "string") {
      return { valid: false, error: "Invalid token" };
    }

    const user = await getUserByAuthToken(token);

    if (!user) {
      return { valid: false, error: "Token not found or expired" };
    }

    return { valid: true, user };
  } catch {
    return { valid: false, error: "Failed to validate token" };
  }
};
