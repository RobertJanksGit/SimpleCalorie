import React, { createContext, useContext, useState, useCallback } from "react";
import { Achievement } from "../types/achievements";
import { AchievementToast } from "../components/achievements/AchievementToast";

interface AchievementContextType {
  showAchievementToast: (achievement: Achievement) => void;
}

const AchievementContext = createContext<AchievementContextType | undefined>(
  undefined
);

export function useAchievementContext() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error(
      "useAchievementContext must be used within an AchievementProvider"
    );
  }
  return context;
}

interface AchievementProviderProps {
  children: React.ReactNode;
}

export function AchievementProvider({ children }: AchievementProviderProps) {
  const [currentAchievement, setCurrentAchievement] =
    useState<Achievement | null>(null);

  const showAchievementToast = useCallback((achievement: Achievement) => {
    setCurrentAchievement(achievement);
  }, []);

  const handleDismiss = useCallback(() => {
    setCurrentAchievement(null);
  }, []);

  return (
    <AchievementContext.Provider value={{ showAchievementToast }}>
      {children}
      {currentAchievement && (
        <AchievementToast
          achievement={currentAchievement}
          onDismiss={handleDismiss}
        />
      )}
    </AchievementContext.Provider>
  );
}
