import { defaultAchievements } from "../data/defaultAchievements";
import { createAchievement } from "../services/achievementService";

export async function initializeAchievements(): Promise<void> {
  try {
    console.log("Starting achievement initialization...");

    for (const achievement of defaultAchievements) {
      await createAchievement(achievement);
      console.log(`Created achievement: ${achievement.name}`);
    }

    console.log("Achievement initialization completed successfully!");
  } catch (error) {
    console.error("Error initializing achievements:", error);
    throw error;
  }
}
