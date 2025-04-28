import { db } from "../../config/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import {
  Achievement,
  UserAchievements,
  UserAchievementProgress,
} from "../types/achievements";

const ACHIEVEMENTS_COLLECTION = "achievements";
const USER_ACHIEVEMENTS_COLLECTION = "userAchievements";

export async function initializeUserAchievements(
  userId: string
): Promise<void> {
  const userAchievementsRef = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);
  const initialData: UserAchievements = {
    userId,
    earnedAchievements: [],
    progressTrackers: {},
    totalPoints: 0,
  };

  await setDoc(userAchievementsRef, initialData);
}

export async function awardAchievement(
  userId: string,
  achievementId: string,
  points: number
): Promise<void> {
  const userAchievementsRef = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);

  await updateDoc(userAchievementsRef, {
    earnedAchievements: arrayUnion(achievementId),
    totalPoints: points,
    [`progressTrackers.${achievementId}`]: {
      achievementId,
      completed: true,
      lastUpdated: serverTimestamp(),
    },
  });
}

export async function updateAchievementProgress(
  userId: string,
  achievementId: string,
  progress: Partial<UserAchievementProgress>
): Promise<void> {
  const userAchievementsRef = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);

  await updateDoc(userAchievementsRef, {
    [`progressTrackers.${achievementId}`]: {
      ...progress,
      lastUpdated: serverTimestamp(),
    },
  });
}

export async function getUserAchievements(
  userId: string
): Promise<UserAchievements | null> {
  const userAchievementsRef = doc(db, USER_ACHIEVEMENTS_COLLECTION, userId);
  const snapshot = await getDoc(userAchievementsRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as UserAchievements;
}

export async function createAchievement(
  achievement: Achievement
): Promise<void> {
  const achievementRef = doc(db, ACHIEVEMENTS_COLLECTION, achievement.id);
  await setDoc(achievementRef, achievement);
}
