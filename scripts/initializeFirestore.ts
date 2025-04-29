import { initializeAchievements } from "../src/scripts/initializeAchievements";

async function main() {
  try {
    console.log("Starting Firestore initialization...");

    // Initialize achievements
    await initializeAchievements();

    console.log("Firestore initialization completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
}

main();
