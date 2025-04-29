import { db } from "../../config/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  FieldValue,
} from "firebase/firestore";
import {
  onMealLogged,
  onDailyCalorieGoalMet,
  onDailyActivityCompleted,
} from "./achievementTriggers";

interface UserActivityLog {
  userId: string;
  lastMealTimestamp: Date | null;
  dailyMealCount: number;
  streakStartDate: Date | null;
  currentStreak: number;
  totalMealsLogged: number;
  totalPhotosLogged: number;
  customRecipesCreated: number;
  weightEntriesCount: number;
  calorieGoalsMetCount: number;
  lastUpdated: Date;
}

const USER_ACTIVITY_COLLECTION = "userActivity";

export async function initializeUserTracking(userId: string): Promise<void> {
  const userActivityRef = doc(db, USER_ACTIVITY_COLLECTION, userId);
  const initialData: UserActivityLog = {
    userId,
    lastMealTimestamp: null,
    dailyMealCount: 0,
    streakStartDate: null,
    currentStreak: 0,
    totalMealsLogged: 0,
    totalPhotosLogged: 0,
    customRecipesCreated: 0,
    weightEntriesCount: 0,
    calorieGoalsMetCount: 0,
    lastUpdated: new Date(),
  };

  await setDoc(userActivityRef, initialData);
}

export async function trackMealLogged(
  userId: string,
  calories: number,
  hasPhoto: boolean,
  timestamp: Date = new Date()
): Promise<void> {
  const userActivityRef = doc(db, USER_ACTIVITY_COLLECTION, userId);

  const updates: Record<string, any> = {
    lastMealTimestamp: timestamp,
    totalMealsLogged: increment(1),
    lastUpdated: timestamp,
  };

  if (hasPhoto) {
    updates.totalPhotosLogged = increment(1);
  }

  await updateDoc(userActivityRef, updates);

  // Trigger achievement checks
  await onMealLogged({
    userId,
    timestamp,
    calories,
    hasPhoto,
  });
}

export async function trackCalorieGoal(
  userId: string,
  targetCalories: number,
  actualCalories: number,
  date: Date = new Date()
): Promise<void> {
  const userActivityRef = doc(db, USER_ACTIVITY_COLLECTION, userId);

  // Check if within 10% margin of target
  const withinGoal =
    Math.abs(targetCalories - actualCalories) <= targetCalories * 0.1;

  if (withinGoal) {
    await updateDoc(userActivityRef, {
      calorieGoalsMetCount: increment(1),
      lastUpdated: date,
    });

    await onDailyCalorieGoalMet({
      userId,
      targetCalories,
      actualCalories,
      date,
    });
  }
}

export async function trackWeightEntry(
  userId: string,
  weight: number,
  date: Date = new Date()
): Promise<void> {
  const userActivityRef = doc(db, USER_ACTIVITY_COLLECTION, userId);

  await updateDoc(userActivityRef, {
    weightEntriesCount: increment(1),
    lastUpdated: date,
  });
}

export async function trackCustomRecipe(
  userId: string,
  date: Date = new Date()
): Promise<void> {
  const userActivityRef = doc(db, USER_ACTIVITY_COLLECTION, userId);

  await updateDoc(userActivityRef, {
    customRecipesCreated: increment(1),
    lastUpdated: date,
  });
}

export async function processDailyReset(userId: string): Promise<void> {
  const userActivityRef = doc(db, USER_ACTIVITY_COLLECTION, userId);

  await updateDoc(userActivityRef, {
    dailyMealCount: 0,
    lastUpdated: serverTimestamp(),
  });

  // Check for daily streak achievements
  await onDailyActivityCompleted(userId);
}

// Helper function to check if two dates are the same day
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
