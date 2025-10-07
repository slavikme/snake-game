"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type GameContextType = {
  isGameInProgress: boolean;
  setIsGameInProgress: (inProgress: boolean) => void;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [isGameInProgress, setIsGameInProgress] = useState(false);

  return (
    <GameContext.Provider value={{ isGameInProgress, setIsGameInProgress }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
