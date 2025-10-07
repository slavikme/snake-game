"use client";

import GameBoard from "@/components/GameBoard";
import { AuthGuard } from "@/components/auth-guard";
import { Score, User } from "@/lib/db/schema";
import { useRouter } from "next/navigation";
import ScoresTable from "@/components/ScoresTable";
import { useEffect, useState, useCallback } from "react";
import { getLeaderboard } from "@/lib/actions/scores";
import { useGame } from "@/contexts/game-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const { isGameInProgress } = useGame();

  const [scores, setScores] = useState<(Score & { user: User })[]>([]);
  const [scoresLoading, setScoresLoading] = useState(true);
  const [scoresError, setScoresError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  const handleShowMoreClick = () => {
    if (isGameInProgress) {
      setShowConfirmDialog(true);
    } else {
      router.push("/scores");
    }
  };

  const handleConfirmNavigation = () => {
    setShowConfirmDialog(false);
    router.push("/scores");
  };

  return (
    <AuthGuard requireAuth={true}>
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
              showMoreLink={true}
              onShowMoreClick={handleShowMoreClick}
            />
          </div>
        </div>
      </main>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Game?</DialogTitle>
            <DialogDescription>
              You are currently in the middle of a game. Are you sure you want
              to leave? Your progress will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmNavigation}>Leave Game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}
