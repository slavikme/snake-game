"use client";

import GameBoard from "@/components/GameBoard";
import { AuthGuard } from "@/components/auth-guard";
import { UserAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Score } from "@/lib/db/schema";
import Image from "next/image";
import { FaGithub, FaUserEdit } from "react-icons/fa";
import { LuLogOut } from "react-icons/lu";
import { useLocalStorage } from "usehooks-ts";
import { useRouter } from "next/navigation";
import ScoresTable from "@/components/ScoresTable";
import { useEffect, useState, useCallback } from "react";
import { getLeaderboard } from "@/lib/actions/scores";

export default function Home() {
  const router = useRouter();
  const [, , removeAuthToken] = useLocalStorage("authToken", "");
  const [user, , removeUser] = useLocalStorage<User | null>("user", null);
  const [, , removeAuthCreatedAt] = useLocalStorage<string | null>(
    "authCreatedAt",
    null
  );

  const [scores, setScores] = useState<(Score & { user: User })[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setScoresLoading(true);
      const result = await getLeaderboard(10); // Get top 10 scores

      if (result.success) {
        setScores(result.scores);
        setScoresError(null);
      } else {
        setScoresError(result.error);
      }
    } catch (err) {
      setScoresError("Failed to load leaderboard");
      console.error(err);
    } finally {
      setScoresLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleScoreSaved = () => {
    // Refresh the leaderboard when a score is saved
    fetchLeaderboard();
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="relative font-sans flex flex-col items-center justify-between min-h-screen bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 from-slate-100 via-slate-200 to-slate-100">
        <header className="flex gap-2 justify-between w-full p-3">
          <h1 className="text-2xl font-bold flex gap-3 items-center">
            <Image
              src="/icon-96.png"
              alt="Snake Game Icon"
              width={40}
              height={40}
              className="inline-block"
            />
            Snake Game
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <UserAvatar className="text-sm" name={user?.name ?? ""} />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-40">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserAvatar
                    className="size-10 text-lg"
                    name={user?.name ?? ""}
                  />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold text-lg">
                      {user?.name ?? ""}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <FaUserEdit />
                  Edit Profile
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => {
                    removeUser();
                    removeAuthToken();
                    removeAuthCreatedAt();
                    router.push("/signup");
                  }}
                >
                  <LuLogOut />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
          <div className="w-250 max-w-screen p-3 flex flex-col gap-8">
            <div className="flex flex-col gap-2 w-full">
              <p className="text-sm text-neutral-500">
                Use the <strong>arrow keys</strong> to move the snake. Press the{" "}
                <strong>spacebar</strong> to pause the game.
              </p>
              <GameBoard onScoreSaved={handleScoreSaved} />
            </div>
            <div className="flex flex-col gap-2 w-full">
              <h2 className="text-lg font-bold">Top 10 Scores</h2>
              <ScoresTable
                scores={scores}
                loading={scoresLoading}
                error={scoresError}
              />
            </div>
          </div>
        </main>
        <footer className="flex flex-row gap-5 items-center justify-center p-3">
          <small>Copyright © 2025 - Slavik Meltser</small>
          <small className="flex gap-[24px] flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 hover:underline hover:underline-offset-4"
              href="https://github.com/slavikme/snake-game"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FaGithub />
              GitHub
            </a>
          </small>
        </footer>
      </div>
    </AuthGuard>
  );
}
