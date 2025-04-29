import { checkAchievements } from "./achievementChecker";

interface MealLogData {
  userId: string;
  timestamp: Date;
  calories: number;
  hasPhoto: boolean;
}

interface CalorieGoalData {
  userId: string;
  targetCalories: number;
  actualCalories: number;
  date: Date;
}

export async function onMealLogged(data: MealLogData): Promise<void> {
  // Check for meal logging related achievements
  await checkAchievements(data.userId, "meal_log", {
    timestamp: data.timestamp,
    hasPhoto: data.hasPhoto,
  });

  // If meal was logged with a photo
  if (data.hasPhoto) {
    await checkAchievements(data.userId, "photo_log", {
      timestamp: data.timestamp,
    });
  }

  // Check for time-based achievements (e.g., night owl)
  const hour = data.timestamp.getHours();
  if (hour >= 22 || hour < 4) {
    await checkAchievements(data.userId, "late_night_log", {
      timeAfter: `${hour}:00`,
    });
  }
}

export async function onDailyCalorieGoalMet(
  data: CalorieGoalData
): Promise<void> {
  // Check if user met their calorie goal
  const goalMet =
    Math.abs(data.targetCalories - data.actualCalories) <=
    data.targetCalories * 0.1; // 10% margin

  if (goalMet) {
    await checkAchievements(data.userId, "calorie_goal_met", {
      date: data.date,
      targetCalories: data.targetCalories,
      actualCalories: data.actualCalories,
    });
  }
}

export async function onDailyActivityCompleted(userId: string): Promise<void> {
  // Check for daily streaks
  await checkAchievements(userId, "daily_log", {
    date: new Date(),
  });
}

// Add more trigger functions as needed for:
// - Weight logging
// - Recipe creation
// - Social interactions
// - etc.
