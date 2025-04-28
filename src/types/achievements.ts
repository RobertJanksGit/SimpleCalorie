import { Timestamp } from "firebase/firestore";

export type AchievementCategory = "Daily" | "Habit" | "Goal" | "Social";
export type AchievementType = "streak" | "single" | "cumulative" | "social";

export interface AchievementCriteria {
  action: string;
  count?: number;
  duration?: number;
  target?: number;
  conditions?: Record<string, any>;
}

export interface AchievementReward {
  points: number;
  badge: string;
  title?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  type: AchievementType;
  criteria: AchievementCriteria;
  reward?: AchievementReward;
  hidden: boolean;
}

export interface UserAchievementProgress {
  achievementId: string;
  currentCount?: number;
  currentStreak?: number;
  highestStreak?: number;
  lastUpdated: Timestamp;
  completed: boolean;
}

export interface UserAchievements {
  userId: string;
  earnedAchievements: string[];
  progressTrackers: Record<string, UserAchievementProgress>;
  totalPoints: number;
}
