"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAchievements = initializeAchievements;
const defaultAchievements_1 = require("../data/defaultAchievements");
const achievementService_1 = require("../services/achievementService");
async function initializeAchievements(db) {
    try {
        console.log("Starting achievement initialization...");
        for (const achievement of defaultAchievements_1.defaultAchievements) {
            await (0, achievementService_1.createAchievement)(db, achievement);
            console.log(`Created achievement: ${achievement.name}`);
        }
        console.log("Achievement initialization completed successfully!");
    }
    catch (error) {
        console.error("Error initializing achievements:", error);
        throw error;
    }
}
