"use client";

import useSnake, { FoodKind, UseSnakeOptions } from "@/hooks/useSnake";
import { cn } from "@/lib/utils";
import { FC, useCallback, useState, useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { saveScore } from "@/lib/actions/scores";
import type { User } from "@/lib/db/schema";
import { useGame } from "@/contexts/game-context";

type GameBoardProps = {
  columns?: number;
  rows?: number;
  options?: Pick<
    UseSnakeOptions,
    "initialIntervalMs" | "intervalReductionFactor"
  >;
  onScoreSaved?: () => void;
};

const DEFAULT_COLUMNS = 45;
const DEFAULT_ROWS = 30;
const DEFAULT_INITIAL_INTERVAL_MS = 200;
const DEFAULT_INTERVAL_REDUCTION_FACTOR = 0.03;

/** The maximum score for an apple. */
const APPLE_MAX_SCORE = 10;
/** The maximum time for an apple to be eaten in milliseconds. When it passes this time, the score is the minimum score. */
const APPLE_MAX_MS = 10_000;
/** The minimum score for an apple. */
const APPLE_MIN_SCORE = 1;

/**
 * Calculate the score for an apple based on the time it was eaten.
 * @param eatTime - The time it took to eat the apple in milliseconds.
 * @returns The score for the apple.
 */
const calculateAppleScore = (eatTime: number) =>
  Math.max(APPLE_MIN_SCORE, (1 - eatTime / APPLE_MAX_MS) * APPLE_MAX_SCORE);

const GameBoard: FC<GameBoardProps> = ({
  columns = DEFAULT_COLUMNS,
  rows = DEFAULT_ROWS,
  options = {},
  onScoreSaved,
}) => {
  const {
    initialIntervalMs = DEFAULT_INITIAL_INTERVAL_MS,
    intervalReductionFactor = DEFAULT_INTERVAL_REDUCTION_FACTOR,
  } = options;

  const { setIsGameInProgress } = useGame();
  const [score, setScore] = useState(0);
  const [topScore, setTopScore] = useLocalStorage("top-score", 0, {
    initializeWithValue: false,
  });
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [user] = useLocalStorage<User | null>("user", null, {
    initializeWithValue: false,
  });
  const [applesEaten, setApplesEaten] = useState(0);

  const onFoodEaten = useCallback((foodKind: FoodKind, lastEatTime: number) => {
    let value = 0;
    const eatTime = Date.now() - lastEatTime;
    if (foodKind === "apple") {
      value = calculateAppleScore(eatTime);
      setApplesEaten((prev) => prev + 1);
    }
    setScore((prevScore) => prevScore + value);
  }, []);

  const { reset, resume, foodPosition, speed, stepMs, getCell, paused } =
    useSnake(columns, rows, {
      initialyPaused: true,
      initialIntervalMs,
      intervalReductionFactor,
      onFoodEaten,
      onGameOver: useCallback(
        async ({ speed, stepMs }: { speed: number; stepMs: number }) => {
          setTopScore((currentTopScore) => Math.max(currentTopScore, score));
          setGameStarted(false);
          setGameOver(true);
          setIsGameInProgress(false);

          // Save score to database if user is authenticated
          if (user?.id && score > 0) {
            try {
              const result = await saveScore(user.id, {
                score,
                level: speed,
                speedMs: Math.round(stepMs),
                apples: applesEaten,
              });

              if (!result.success) {
                console.error("Failed to save score:", result.error);
              } else {
                // Notify parent component that score was saved
                onScoreSaved?.();
              }
            } catch (error) {
              console.error("Error saving score:", error);
            }
          }
        },
        [
          score,
          setTopScore,
          user,
          applesEaten,
          onScoreSaved,
          setIsGameInProgress,
        ]
      ),
    });

  // Update game in progress state when game starts/pauses
  useEffect(() => {
    setIsGameInProgress(gameStarted && !paused && !gameOver);
  }, [gameStarted, paused, gameOver, setIsGameInProgress]);

  const cells = Array.from({ length: columns * rows }, (_, index) => ({
    x: index % columns,
    y: Math.floor(index / columns),
  }));

  return (
    <div className="flex flex-col gap-2 h-192 max-h-screen">
      <ul className="flex gap-x-5 gap-y-1 px-2 py-1 bg-background rounded-lg flex-wrap">
        <li className="flex items-center gap-2">
          <span>Speed:</span>
          <span className="whitespace-nowrap">
            {speed}{" "}
            <span className="text-xs text-neutral-500">
              ({stepMs.toFixed(0)}ms)
            </span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span>Score:</span>
          <span>{score.toFixed(0)}</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="whitespace-nowrap">Top Score:</span>
          <span>{topScore.toFixed(0)}</span>
        </li>
      </ul>
      <div
        style={
          {
            "--columns": `repeat(${columns}, minmax(0, 1fr))`,
            "--rows": `repeat(${rows}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
        className="relative w-full gap-[1px] grid grid-cols-(--columns) grid-rows-(--rows) overflow-hidden bg-background rounded-lg"
      >
        {cells.map((cell) => {
          const s = getCell(cell.x, cell.y);
          return (
            <div
              key={`${cell.x}-${cell.y}`}
              className={cn(
                "aspect-square border-background",
                s !== undefined
                  ? "bg-green-600"
                  : cell.x === foodPosition.x && cell.y === foodPosition.y
                  ? "bg-red-500 rounded-full"
                  : "",
                s !== undefined && {
                  "border-l-1":
                    (s.last === "up" &&
                      (s.next === "up" || s.next === "right")) ||
                    (s.last === "down" &&
                      (s.next === "down" || s.next === "right")) ||
                    (s.last === "left" &&
                      (s.next === "up" || s.next === "down" || s.isHead)) ||
                    (s.last === "right" && s.isTail),
                  "border-r-1":
                    (s.last === "up" &&
                      (s.next === "up" || s.next === "left")) ||
                    (s.last === "down" &&
                      (s.next === "down" || s.next === "left")) ||
                    (s.last === "right" &&
                      (s.next === "up" || s.next === "down" || s.isHead)) ||
                    (s.last === "left" && s.isTail),
                  "border-t-1":
                    (s.last === "up" &&
                      (s.next === "right" || s.next === "left" || s.isHead)) ||
                    (s.last === "right" &&
                      (s.next === "right" || s.next === "down")) ||
                    (s.last === "left" &&
                      (s.next === "down" || s.next === "left")) ||
                    (s.last === "down" && s.isTail),
                  "border-b-1":
                    (s.last === "down" &&
                      (s.next === "right" || s.next === "left" || s.isHead)) ||
                    (s.last === "right" &&
                      (s.next === "up" || s.next === "right")) ||
                    (s.last === "left" &&
                      (s.next === "up" || s.next === "left")) ||
                    (s.last === "up" && s.isTail),
                  // if the border is more than 1px add "[corner-bottom-left-shape:scoop]" - there is a bug with corner-shape property with 1px border in webkit
                  "rounded-bl-[1px] rounded-tr-[100%]":
                    (s.last === "up" && s.next === "left") ||
                    (s.last === "right" && s.next === "down"),
                  // if the border is more than 1px add "[corner-bottom-right-shape:scoop]" - there is a bug with corner-shape property with 1px border in webkit
                  "rounded-br-[1px] rounded-tl-[100%]":
                    (s.last === "up" && s.next === "right") ||
                    (s.last === "left" && s.next === "down"),
                  // if the border is more than 1px add "[corner-top-left-shape:scoop]" - there is a bug with corner-shape property with 1px border in webkit
                  "rounded-tl-[1px] rounded-br-[100%]":
                    (s.last === "down" && s.next === "left") ||
                    (s.last === "right" && s.next === "up"),
                  // if the border is more than 1px add "[corner-top-right-shape:scoop]" - there is a bug with corner-shape property with 1px border in webkit
                  "rounded-tr-[1px] rounded-bl-[100%]":
                    (s.last === "down" && s.next === "right") ||
                    (s.last === "left" && s.next === "up"),
                  "rounded-bl-[100%]":
                    (s.isTail && ["up", "right"].includes(s.last)) ||
                    (s.isHead && ["down", "left"].includes(s.next)),
                  "rounded-br-[100%]":
                    (s.isTail && ["up", "left"].includes(s.last)) ||
                    (s.isHead && ["down", "right"].includes(s.next)),
                  "rounded-tl-[100%]":
                    (s.isTail && ["down", "right"].includes(s.last)) ||
                    (s.isHead && ["up", "left"].includes(s.next)),
                  "rounded-tr-[100%]":
                    (s.isTail && ["down", "left"].includes(s.last)) ||
                    (s.isHead && ["up", "right"].includes(s.next)),
                }
              )}
            />
          );
        })}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 z-50">
            <div className="text-2xl font-bold">Game Over</div>
            <div className="text-sm text-neutral-500">
              Your score: {score.toFixed(0)}
            </div>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
              onClick={() => {
                reset();
                setGameOver(false);
                resume();
                setScore(0);
                setApplesEaten(0);
                setGameStarted(true);
              }}
              tabIndex={0}
              autoFocus={true}
            >
              Play Again
            </button>
          </div>
        )}
        {paused && !gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 z-50">
            <div className="text-2xl font-bold">
              {gameStarted ? "Paused" : "Ready to play?"}
            </div>
            <button
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
              onClick={() => {
                resume();
                setGameStarted(true);
              }}
              tabIndex={0}
              autoFocus={true}
            >
              {gameStarted ? "Resume" : "Start"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
