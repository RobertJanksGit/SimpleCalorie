"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const initializeAchievements_1 = require("../src/scripts/initializeAchievements");
const firebase_1 = require("../config/firebase");
async function main() {
    try {
        console.log("Starting Firestore initialization...");
        // Initialize achievements, passing the db instance
        await (0, initializeAchievements_1.initializeAchievements)(firebase_1.db);
        console.log("Firestore initialization completed successfully!");
        process.exit(0);
    }
    catch (error) {
        console.error("Error during initialization:", error);
        process.exit(1);
    }
}
main();
