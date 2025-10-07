"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import type { Score, User } from "@/lib/db/schema";
import Link from "next/link";

type ScoresTableProps = {
  scores: (Score & { user: User })[];
  loading?: boolean;
  error?: string | null;
  showMoreLink?: boolean;
  onShowMoreClick?: () => void;
};

const getRank = (index: number) => {
  switch (index) {
    case 0:
      return "🥇";
    case 1:
      return "🥈";
    case 2:
      return "🥉";
    default:
      return index + 1;
  }
};

const ScoresTable = ({
  scores,
  loading = false,
  error = null,
  showMoreLink = false,
  onShowMoreClick,
}: ScoresTableProps) => {
  const [selectedScore, setSelectedScore] = useState<
    (Score & { user: User }) | null
  >(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleRowClick = (score: Score & { user: User }) => {
    setSelectedScore(score);
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div>Loading leaderboard...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (scores.length === 0) {
    return <div>No scores yet. Be the first to play!</div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scores.map((score, index) => (
            <TableRow
              key={score.id}
              onClick={() => handleRowClick(score)}
              className={cn(
                "cursor-pointer transition-all hover:bg-muted/70",
                index === 0 && "text-xl font-bold",
                index === 1 && "text-lg font-bold",
                index === 2 && "text-md font-bold",
                index > 2 && "text-sm"
              )}
            >
              <TableCell className="font-bold">
                <span className="flex items-center gap-2">
                  {getRank(index)}
                </span>
              </TableCell>
              <TableCell
                className={cn(
                  index === 0 && "text-yellow-600",
                  index === 1 && "text-gray-400",
                  index === 2 && "text-amber-700",
                  index > 2 && "text-sm"
                )}
              >
                {score.user.name}
              </TableCell>
              <TableCell className="text-right">
                <Badge
                  className="font-bold text-md"
                  variant={
                    index === 0
                      ? "gold"
                      : index === 1
                      ? "silver"
                      : index === 2
                      ? "bronze"
                      : "default"
                  }
                >
                  {score.score.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {showMoreLink && (
        <div className="flex justify-center mt-4">
          <Link
            href="/scores"
            onClick={(e) => {
              if (onShowMoreClick) {
                e.preventDefault();
                onShowMoreClick();
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            Show More
          </Link>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Score Details</DialogTitle>
            <DialogDescription>
              Detailed information about this game session
            </DialogDescription>
          </DialogHeader>
          {selectedScore && (
            <div className="space-y-4 py-4">
              {/* Rank Display */}
              <div className="flex items-center justify-center py-6 border-b-2">
                {(() => {
                  const rank = scores.findIndex(
                    (s) => s.id === selectedScore.id
                  );
                  if (rank === 0) {
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-7xl animate-bounce">🏆</div>
                        <div className="text-5xl font-black text-yellow-500 drop-shadow-lg">
                          1st Place
                        </div>
                        <div className="text-xl font-bold text-yellow-600">
                          Champion!
                        </div>
                      </div>
                    );
                  } else if (rank === 1) {
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-6xl">🥈</div>
                        <div className="text-4xl font-black text-gray-400 drop-shadow-lg">
                          2nd Place
                        </div>
                        <div className="text-lg font-bold text-gray-500">
                          Outstanding!
                        </div>
                      </div>
                    );
                  } else if (rank === 2) {
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-6xl">🥉</div>
                        <div className="text-4xl font-black text-amber-700 drop-shadow-lg">
                          3rd Place
                        </div>
                        <div className="text-lg font-bold text-amber-800">
                          Excellent!
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-5xl">🎮</div>
                        <div className="text-3xl font-bold text-foreground">
                          Rank #{rank + 1}
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">
                          Great effort!
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Player
                </span>
                <span className="text-lg font-bold">
                  {selectedScore.user.name}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Score
                </span>
                <Badge variant="default" className="text-lg font-bold">
                  {selectedScore.score.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Level
                </span>
                <span className="text-lg font-semibold">
                  {selectedScore.level}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Speed
                </span>
                <span className="text-lg font-semibold">
                  {selectedScore.speedMs}ms
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Apples Collected
                </span>
                <span className="text-lg font-semibold">
                  🍎 {selectedScore.apples}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Date
                </span>
                <span className="text-sm font-semibold">
                  {new Date(selectedScore.createdAt).toLocaleDateString(
                    undefined,
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScoresTable;
