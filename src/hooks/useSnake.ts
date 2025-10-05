"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

export type FoodKind = "apple";

export type UseSnakeOptions = {
  /**
   * The initial interval in milliseconds of the snake.
   * This is the time between each step of the snake.
   * If not provided, it is automatically calculated based on the columns and rows.
   */
  initialIntervalMs?: number;

  /**
   * The factor by which the interval is reduced when the snake eats a food.
   * This is the factor by which the interval is reduced.
   * If not provided, it is 0.1.
   */
  intervalReductionFactor?: number;

  /**
   * The initial direction of the snake.
   * If not provided, it is "up".
   */
  initialDirection?: Direction;

  /**
   * The initial position of the snake.
   * If not provided, it is the center of the board.
   */
  initialPosition?: { x: number; y: number };

  /**
   * Whether the snake is initially paused.
   * If not provided, it is false.
   */
  initialyPaused?: boolean;

  /**
   * A callback function that is called when the snake eats a food.
   * If not provided, it is undefined.
   * The `lastEatTime` is the time when the last food was eaten. Timestamp in milliseconds.
   *
   * **Note: Make sure to wrap the callback in _useCallback_ to avoid unnecessary re-renders.**
   */
  onFoodEaten?: (foodKind: FoodKind, lastEatTime: number) => void;

  /**
   * A callback function that is called when the game is over.
   * If not provided, it is undefined.
   *
   * **Note: Make sure to wrap the callback in _useCallback_ to avoid unnecessary re-renders.**
   */
  onGameOver?: () => void;
};

const useSnake = (
  columns: number,
  rows: number,
  options: UseSnakeOptions = {}
) => {
  const {
    initialIntervalMs = 200 * (2000 / (columns * rows * 6)),
    intervalReductionFactor = SPEED_REDUCTION_FACTOR,
    initialDirection = "up",
    initialPosition: { x: initialX, y: initialY } = {
      x: Math.floor(columns / 2),
      y: Math.floor(rows / 2),
    },
    initialyPaused = false,
    onFoodEaten,
    onGameOver,
  } = options;

  const [body, setBody] = useState<SnakeBody>([
    {
      x: initialX,
      y: initialY,
      next: initialDirection,
      last: initialDirection,
      isHead: true,
      isTail: true,
    },
  ]);

  const directionRef = useRef<Direction>(initialDirection);
  const [speed, setSpeed] = useState(0);
  const [paused, setPaused] = useState(initialyPaused);
  const [gameOver, setGameOver] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [stepMs, setStepMs] = useState(initialIntervalMs);
  const [lastEatTime, setLastEatTime] = useState(0);

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
      setPaused(true);
      setGameOver(true);
      onGameOver?.();
      return;
    }
    // Check if the head is about to eat the food
    if (isFoodPosition(newHead.x, newHead.y)) {
      setFoodPosition(generateFoodPosition());
      setSpeed(speed + 1);
      setStepMs(stepMs - stepMs * intervalReductionFactor);
      grow = true;
      newHead.isTail = false;
      onFoodEaten?.("apple", lastEatTime);
      setLastEatTime(Date.now());
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
    onGameOver,
    generateFoodPosition,
    speed,
    stepMs,
    intervalReductionFactor,
    onFoodEaten,
    lastEatTime,
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
    setStepMs(initialIntervalMs);
    setLastEatTime(0);
  }, [columns, rows, generateFoodPosition, initialIntervalMs]);

  // Initialize food position after mount to avoid hydration mismatch
  useEffect(() => {
    if (mounted) return;
    setMounted(true);
    setFoodPosition(generateFoodPosition());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || !mounted) return;
    const interval = setInterval(doStep, stepMs);
    return () => clearInterval(interval);
  }, [doStep, paused, mounted, stepMs]);

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

  useEffect(() => {
    // If the game is started the very first time, start the eat counter
    if (!paused && lastEatTime === 0) {
      setLastEatTime(Date.now());
    }
  }, [paused, lastEatTime]);

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
    foodPosition,
    stepMs,
    getCell,
  };
};

export default useSnake;
