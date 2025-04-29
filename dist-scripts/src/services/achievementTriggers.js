"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMealLogged = onMealLogged;
exports.onCalorieGoalMet = onCalorieGoalMet;
exports.onDailyActivityCompleted = onDailyActivityCompleted;
const achievementChecker_1 = require("./achievementChecker");
const firebase_1 = require("../../config/firebase"); // Ensure db is imported here
const firestore_1 = require("firebase/firestore");
async function onMealLogged(data) {
    const logTimestamp = data.timestamp instanceof firestore_1.Timestamp
        ? data.timestamp.toDate()
        : data.timestamp;
    // Pass db to checkAchievements
    await (0, achievementChecker_1.checkAchievements)(firebase_1.db, data.userId, "meal_log", {
        timestamp: logTimestamp,
        hasPhoto: data.hasPhoto,
    });
    if (data.hasPhoto) {
        // Pass db to checkAchievements
        await (0, achievementChecker_1.checkAchievements)(firebase_1.db, data.userId, "photo_log", {
            timestamp: logTimestamp,
        });
    }
    const hour = logTimestamp.getHours();
    if (hour >= 22 || hour < 4) {
        // Pass db to checkAchievements
        await (0, achievementChecker_1.checkAchievements)(firebase_1.db, data.userId, "late_night_log", {
            timeAfter: `${hour}:00`, // Ensure condition format matches achievement data
        });
    }
}
async function onCalorieGoalMet(data) {
    if (data.metGoal) {
        // Pass db to checkAchievements
        await (0, achievementChecker_1.checkAchievements)(firebase_1.db, data.userId, "calorie_goal_met", {
            date: data.date instanceof firestore_1.Timestamp ? data.date.toDate() : data.date,
        });
    }
}
async function onDailyActivityCompleted(userId) {
    // Pass db to checkAchievements
    await (0, achievementChecker_1.checkAchievements)(firebase_1.db, userId, "daily_log", {
        date: new Date(),
    });
}
// Add more trigger functions as needed for:
// - Weight logging
// - Recipe creation
// - Social interactions
// - etc.
