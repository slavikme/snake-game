"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

const GameBoardPhaser = () => {
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
          gameContainerRef.current.removeChild(
            gameContainerRef.current.firstChild
          );
        }

        // Initialize Phaser game
        const config = {
          type: PhaserLib.AUTO,
          width: 1024,
          height: 768,
          parent: gameContainerRef.current,
          backgroundColor: "#028af8",
          scale: {
            mode: PhaserLib.Scale.FIT,
            autoCenter: PhaserLib.Scale.NO_CENTER,
          },
          scene: [Boot, Preloader, Game],
        };

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
  }, []);

  return (
    <div className="w-full flex justify-center overflow-hidden aspect-[1024/768]">
      <div
        ref={gameContainerRef}
        id="phaser-game-container"
        className="w-full h-full relative"
      />
    </div>
  );
};

export default GameBoardPhaser;
