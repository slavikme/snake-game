"use client";

import useSnake from "@/hooks/useSnake";
import { cn } from "@/utils/cn";
import { FC } from "react";

type GameBoardProps = {
  columns: number;
  rows: number;
};

const GameBoard: FC<GameBoardProps> = ({ columns, rows }) => {
  const { gameOver, reset, resume, foodPosition, speed, ms, getCell } =
    useSnake(columns, rows);

  const cells = Array.from({ length: columns * rows }, (_, index) => ({
    x: index % columns,
    y: Math.floor(index / columns),
  }));

  return (
    <div className="relative">
      <ul className="flex gap-10">
        <li className="flex items-center gap-2">
          <span>Speed:</span>
          <span>
            {speed}{" "}
            <span className="text-xs text-neutral-500">
              ({ms.toLocaleString()}ms)
            </span>
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span>Score:</span>
          <span></span>
        </li>
      </ul>
      <div
        style={
          {
            "--columns": `repeat(${columns}, minmax(0, 1fr))`,
            "--rows": `repeat(${rows}, minmax(0, 1fr))`,
          } as React.CSSProperties
        }
        className="w-full grid grid-cols-(--columns) grid-rows-(--rows) overflow-hidden"
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
                  "rounded-bl-[1px] rounded-tr-[100%] [corner-shape:round_round_round_scoop]":
                    (s.last === "up" && s.next === "left") ||
                    (s.last === "right" && s.next === "down"),
                  "rounded-br-[1px] rounded-tl-[100%] [corner-shape:round_round_scoop_round]":
                    (s.last === "up" && s.next === "right") ||
                    (s.last === "left" && s.next === "down"),
                  "rounded-tl-[1px] rounded-br-[100%] [corner-shape:scoop_round_round_round]":
                    (s.last === "down" && s.next === "left") ||
                    (s.last === "right" && s.next === "up"),
                  "rounded-tr-[1px] rounded-bl-[100%] [corner-shape:round_scoop_round_round]":
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
      </div>
      {gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 z-50">
          <div className="text-2xl font-bold">Game Over</div>
          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
            onClick={() => {
              reset();
              resume();
            }}
            tabIndex={0}
            autoFocus={true}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
