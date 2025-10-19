"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getPaginatedLeaderboard } from "@/lib/actions/scores";
import { Score, User } from "@/lib/db/schema";
import ScoresTable from "@/components/ScoresTable";
import { AuthGuard } from "@/components/auth-guard";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";
import { useGame } from "@/contexts/game-context";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ITEMS_PER_PAGE = 20;

export default function ScoresPage() {
  const router = useRouter();
  const { isGameInProgress } = useGame();
  const [scores, setScores] = useState<(Score & { user: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const loadScores = useCallback(async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const result = await getPaginatedLeaderboard(offset, ITEMS_PER_PAGE);

      if (result.success) {
        if (append) {
          setScores((prev) => [...prev, ...result.scores]);
        } else {
          setScores(result.scores);
        }
        setHasMore(result.hasMore);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError("Failed to load scores");
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadScores();
  }, [loadScores]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadScores(scores.length, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, scores.length, loadScores]);

  const handleBreadcrumbClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isGameInProgress) {
      e.preventDefault();
      setShowConfirmDialog(true);
    }
  };

  const handleConfirmNavigation = () => {
    setShowConfirmDialog(false);
    router.push("/");
  };

  return (
    <AuthGuard requireAuth={true}>
      <>
        <div className="w-full p-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" onClick={handleBreadcrumbClick}>
                    Game
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Scores</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <main className="flex flex-col gap-8 items-center w-full max-w-4xl px-4 pb-8">
          <h1 className="text-3xl font-bold">All Scores</h1>

          <div className="w-full">
            {loading && scores.length === 0 ? (
              <div className="text-center py-8">Loading scores...</div>
            ) : error && scores.length === 0 ? (
              <div className="text-center py-8 text-red-500">Error: {error}</div>
            ) : (
              <>
                <ScoresTable scores={scores} loading={false} error={null} />

                {loadingMore && <div className="text-center py-4">Loading more...</div>}

                {!hasMore && scores.length > 0 && (
                  <div className="text-center py-4 text-muted-foreground">No more scores to load</div>
                )}

                {/* Intersection observer target */}
                <div ref={observerTarget} className="h-4" />
              </>
            )}
          </div>
        </main>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Scores Page?</DialogTitle>
              <DialogDescription>
                You are currently in the middle of a game. Are you sure you want to return to the game? This will navigate away
                from the scores page.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Stay Here
              </Button>
              <Button onClick={handleConfirmNavigation}>Return to Game</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </AuthGuard>
  );
}
