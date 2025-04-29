import { Timestamp } from "firebase/firestore";

export type AchievementType = "streak" | "cumulative" | "social";
export type AchievementCategory = "Daily" | "Habit" | "Goal" | "Social";

export interface AchievementCriteria {
  count: number;
  description?: string;
}

export interface AchievementReward {
  points: number;
  description?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  type: AchievementType;
  criteria: AchievementCriteria;
  reward?: AchievementReward;
  hidden?: boolean;
  icon?: string;
}

export interface UserAchievementProgress {
  currentStreak?: number;
  currentCount?: number;
  lastUpdated?: string;
  metadata?: Record<string, unknown>;
}

export interface UserAchievements {
  earnedAchievements: string[];
  progressTrackers: Record<string, UserAchievementProgress>;
  lastSynced?: string;
}

export interface AchievementToastData {
  achievement: Achievement;
  earnedAt: string;
  points?: number;
}
