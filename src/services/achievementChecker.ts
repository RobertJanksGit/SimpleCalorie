import {
  Achievement,
  UserAchievements,
  UserAchievementProgress,
} from "../types/achievements";
import {
  getUserAchievements,
  updateAchievementProgress,
  awardAchievement,
} from "./achievementService";
import { db } from "../../config/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

interface AchievementCheckResult {
  achieved: boolean;
  progress?: UserAchievementProgress;
}

export async function checkAchievements(
  userId: string,
  action: string,
  data: Record<string, any>
): Promise<void> {
  // Get user's current achievements
  const userAchievements = await getUserAchievements(userId);
  if (!userAchievements) return;

  // Get all achievements from Firestore
  const achievementsRef = collection(db, "achievements");
  const achievementsSnapshot = await getDocs(
    query(achievementsRef, where("criteria.action", "==", action))
  );

  // Check each relevant achievement
  for (const doc of achievementsSnapshot.docs) {
    const achievement = doc.data() as Achievement;

    // Skip if already earned
    if (userAchievements.earnedAchievements.includes(achievement.id)) continue;

    const result = await checkSingleAchievement(
      userId,
      achievement,
      data,
      userAchievements
    );

    if (result.achieved) {
      // Award the achievement
      await awardAchievement(
        userId,
        achievement.id,
        userAchievements.totalPoints + (achievement.reward?.points || 0)
      );
    } else if (result.progress) {
      // Update progress
      await updateAchievementProgress(userId, achievement.id, result.progress);
    }
  }
}

async function checkSingleAchievement(
  userId: string,
  achievement: Achievement,
  data: Record<string, any>,
  userAchievements: UserAchievements
): Promise<AchievementCheckResult> {
  const currentProgress = userAchievements.progressTrackers[achievement.id] || {
    achievementId: achievement.id,
    currentCount: 0,
    currentStreak: 0,
    highestStreak: 0,
    lastUpdated: null,
    completed: false,
  };

  switch (achievement.type) {
    case "single":
      return checkSingleTypeAchievement(achievement, data);

    case "cumulative":
      return checkCumulativeAchievement(achievement, currentProgress);

    case "streak":
      return checkStreakAchievement(achievement, currentProgress, data);

    case "social":
      return checkSocialAchievement(achievement, data);

    default:
      return { achieved: false };
  }
}

function checkSingleTypeAchievement(
  achievement: Achievement,
  data: Record<string, any>
): AchievementCheckResult {
  // Check conditions if they exist
  if (achievement.criteria.conditions) {
    for (const [key, value] of Object.entries(
      achievement.criteria.conditions
    )) {
      if (data[key] !== value) {
        return { achieved: false };
      }
    }
  }

  return { achieved: true };
}

function checkCumulativeAchievement(
  achievement: Achievement,
  progress: UserAchievementProgress
): AchievementCheckResult {
  const newCount = (progress.currentCount || 0) + 1;
  const achieved = newCount >= (achievement.criteria.count || 0);

  return {
    achieved,
    progress: {
      ...progress,
      currentCount: newCount,
    },
  };
}

function checkStreakAchievement(
  achievement: Achievement,
  progress: UserAchievementProgress,
  data: Record<string, any>
): AchievementCheckResult {
  const lastUpdate = progress.lastUpdated?.toDate() || new Date(0);
  const today = new Date();
  const isConsecutiveDay =
    lastUpdate.getDate() === today.getDate() - 1 || !progress.lastUpdated; // First entry

  const newStreak = isConsecutiveDay ? (progress.currentStreak || 0) + 1 : 1;
  const newHighestStreak = Math.max(newStreak, progress.highestStreak || 0);
  const achieved = newStreak >= (achievement.criteria.count || 0);

  return {
    achieved,
    progress: {
      ...progress,
      currentStreak: newStreak,
      highestStreak: newHighestStreak,
    },
  };
}

function checkSocialAchievement(
  achievement: Achievement,
  data: Record<string, any>
): AchievementCheckResult {
  // Implement social achievement logic here
  // This could involve checking friend counts, shares, etc.
  return { achieved: false };
}
