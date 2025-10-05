"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SPEED_START_MS = 200;
const SPEED_REDUCTION_FACTOR = 0.1;

type Direction = "up" | "down" | "left" | "right";

type SnakeBodyCell = {
  x: number;
  y: number;
  next: Direction;
  last: Direction;
  isHead: boolean;
  isTail: boolean;
};

type SnakeBody = [SnakeBodyCell, ...SnakeBodyCell[]];

const useSnake = (columns: number, rows: number) => {
  const [body, setBody] = useState<SnakeBody>([
    {
      x: Math.floor(columns / 2),
      y: Math.floor(rows / 2),
      next: "up",
      last: "up",
      isHead: true,
      isTail: true,
    },
  ]);
  const initSpeed = SPEED_START_MS * (2000 / (columns * rows * 6));

  const directionRef = useRef<Direction>("up");
  const [speed, setSpeed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ms, setMs] = useState(initSpeed);

  const isBodyCell = useCallback(
    (x: number, y: number) => body.some((cell) => cell.x === x && cell.y === y),
    [body]
  );

  const generateFoodPosition = useCallback(() => {
    const position = {
      x: Math.floor(Math.random() * columns),
      y: Math.floor(Math.random() * rows),
    };
    if (isBodyCell(position.x, position.y)) {
      return generateFoodPosition();
    }
    return position;
  }, [columns, rows, isBodyCell]);

  const [foodPosition, setFoodPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const isOutOfBounds = useCallback(
    (x: number, y: number) => x < 0 || x >= columns || y < 0 || y >= rows,
    [columns, rows]
  );

  const isFoodPosition = useCallback(
    (x: number, y: number) => x === foodPosition.x && y === foodPosition.y,
    [foodPosition]
  );

  const doStep = useCallback(() => {
    const dir = directionRef.current;
    // the new head is always added at the new position, regardless the length of the snake
    const newHead = {
      x: body[0].x + (dir === "left" ? -1 : dir === "right" ? 1 : 0),
      y: body[0].y + (dir === "up" ? -1 : dir === "down" ? 1 : 0),
      next: dir,
      last: dir,
      isHead: true,
      isTail: body.length === 1,
    };
    let grow = false;
    if (
      isOutOfBounds(newHead.x, newHead.y) ||
      isBodyCell(newHead.x, newHead.y)
    ) {
      setGameOver(true);
      setPaused(true);
      return;
    }
    // Check if the head is about to eat the food
    if (isFoodPosition(newHead.x, newHead.y)) {
      setFoodPosition(generateFoodPosition());
      setSpeed(speed + 1);
      setMs(ms - ms * SPEED_REDUCTION_FACTOR);
      grow = true;
      newHead.isTail = false;
    }
    if (body.length === 1) {
      setBody(
        grow
          ? [
              newHead,
              {
                ...body[0],
                next: newHead.next,
                last: newHead.next,
                isHead: false,
                isTail: true,
              },
            ]
          : [newHead]
      );
    } else {
      if (grow) {
        // the snake stays at the same position with the same length, except the head is no longer a head
        setBody([
          newHead,
          { ...body[0], next: newHead.next, isHead: false },
          ...body.slice(1),
        ]);
      } else {
        // the head is no longer the head, and the tail is no longer the tail. The new tail is the second to last cell.
        if (body.length === 2) {
          setBody([
            newHead,
            {
              ...body[0],
              next: newHead.next,
              last: newHead.next,
              isHead: false,
              isTail: true,
            },
          ]);
        } else {
          setBody([
            newHead,
            // no need to change the tail here, because it should be already false
            { ...body[0], next: newHead.next, isHead: false },
            // Cut the head, it's handled above
            // Cut the tail, it's suppose to be removed from the body
            // Cut the second to last cell, it's handled below
            ...body.slice(1, -2),
            // Set the second to last cell to be the new tail
            {
              ...body[body.length - 2],
              last: body[body.length - 2].next,
              isTail: true,
            },
          ]);
        }
      }
    }
  }, [
    body,
    isOutOfBounds,
    isBodyCell,
    isFoodPosition,
    generateFoodPosition,
    speed,
    ms,
  ]);

  const reset = useCallback(() => {
    setGameOver(false);
    setFoodPosition(generateFoodPosition());
    directionRef.current = "up";
    setBody([
      {
        x: Math.floor(columns / 2),
        y: Math.floor(rows / 2),
        next: "up",
        last: "up",
        isHead: true,
        isTail: true,
      },
    ]);
    setSpeed(0);
    setMs(initSpeed);
  }, [columns, rows, generateFoodPosition, initSpeed]);

  // Initialize food position after mount to avoid hydration mismatch
  useEffect(() => {
    if (mounted) return;
    setMounted(true);
    setFoodPosition(generateFoodPosition());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || !mounted) return;
    const interval = setInterval(doStep, ms);
    return () => clearInterval(interval);
  }, [doStep, paused, mounted, ms]);

  useEffect(() => {
    if (gameOver) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp" && directionRef.current !== "down") {
        event.preventDefault();
        directionRef.current = "up";
      } else if (event.key === "ArrowDown" && directionRef.current !== "up") {
        event.preventDefault();
        directionRef.current = "down";
      } else if (
        event.key === "ArrowLeft" &&
        directionRef.current !== "right"
      ) {
        event.preventDefault();
        directionRef.current = "left";
      } else if (
        event.key === "ArrowRight" &&
        directionRef.current !== "left"
      ) {
        event.preventDefault();
        directionRef.current = "right";
      } else if (event.key === " ") {
        event.preventDefault();
        setPaused((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameOver]);

  const setDirection = useCallback((direction: Direction) => {
    directionRef.current = direction;
  }, []);

  const pause = useCallback(() => {
    setPaused(true);
  }, []);
  const resume = useCallback(() => {
    setPaused(false);
  }, []);

  const getCell = useCallback(
    (x: number, y: number) => body.find((cell) => cell.x === x && cell.y === y),
    [body]
  );

  return {
    direction: directionRef.current,
    setDirection,
    speed,
    setSpeed,
    reset,
    pause,
    resume,
    paused,
    gameOver,
    foodPosition,
    ms,
    getCell,
  };
};

export default useSnake;
