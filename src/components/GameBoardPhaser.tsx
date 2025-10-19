"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { DEFAULT_SCENE_WIDTH, DEFAULT_SCENE_HEIGHT } from "@/phaser/config/game-config";

type GameBoardPhaserProps = {
  initialWidth?: number;
  initialHeight?: number;
};

const GameBoardPhaser = ({ initialWidth = DEFAULT_SCENE_WIDTH, initialHeight = DEFAULT_SCENE_HEIGHT }: GameBoardPhaserProps) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined" || !gameContainerRef.current) {
      return;
    }

    // Prevent double initialization (important for React StrictMode)
    if (gameInstanceRef.current) {
      return;
    }

    let mounted = true;

    // Load Phaser and initialize game
    const loadAndInitGame = async () => {
      try {
        // Dynamically import Phaser
        const PhaserModule = await import("phaser");
        const PhaserLib = PhaserModule.default;

        // Import the scenes
        const { Boot } = await import("@/phaser/scenes/Boot");
        const { Preloader } = await import("@/phaser/scenes/Preloader");
        const { Game } = await import("@/phaser/scenes/Game");

        // Make sure container still exists and component is still mounted
        if (!mounted || !gameContainerRef.current) {
          console.log("Container removed before game initialization");
          return;
        }

        // Clear any existing canvases in the container
        while (gameContainerRef.current.firstChild) {
          gameContainerRef.current.removeChild(gameContainerRef.current.firstChild);
        }

        // Initialize Phaser game
        const config = {
          type: PhaserLib.AUTO,
          width: initialWidth,
          height: initialHeight,
          parent: gameContainerRef.current,
          backgroundColor: "#000000",
          scale: {
            mode: PhaserLib.Scale.FIT,
            autoCenter: PhaserLib.Scale.CENTER_BOTH,
            fullscreenTarget: gameContainerRef.current,
          },
          scene: [Boot, Preloader, Game],
          render: {
            pixelArt: false,
            antialias: true,
          },
        } satisfies Phaser.Types.Core.GameConfig;

        console.log("Initializing Phaser game...");
        gameInstanceRef.current = new PhaserLib.Game(config);
        console.log("Phaser game initialized successfully");
      } catch (error) {
        console.error("Failed to load Phaser game:", error);
      }
    };

    loadAndInitGame();

    // Cleanup function
    return () => {
      mounted = false;
      console.log("Cleaning up Phaser game");
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, [initialHeight, initialWidth]);

  return (
    <div className="w-full flex justify-center aspect-video max-h-screen">
      <div ref={gameContainerRef} id="phaser-game-container" className="relative w-full h-full" />
    </div>
  );
};

export default GameBoardPhaser;
