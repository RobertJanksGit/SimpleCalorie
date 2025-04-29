"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeUserTracking = initializeUserTracking;
exports.trackMealLogged = trackMealLogged;
exports.updateUserStatsOnMealLog = updateUserStatsOnMealLog;
exports.trackWeightEntry = trackWeightEntry;
exports.trackCustomRecipe = trackCustomRecipe;
exports.processDailyReset = processDailyReset;
const firebase_1 = require("../../config/firebase");
const firestore_1 = require("firebase/firestore");
const achievementTriggers_1 = require("./achievementTriggers");
const USER_ACTIVITY_COLLECTION = "userActivity";
const USER_STATS_COLLECTION = "userStats";
async function initializeUserTracking(userId) {
    const userActivityRef = (0, firestore_1.doc)(firebase_1.db, USER_ACTIVITY_COLLECTION, userId);
    const initialData = {
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
    await (0, firestore_1.setDoc)(userActivityRef, initialData);
}
async function trackMealLogged(userId, calories, hasPhoto, timestamp = new Date()) {
    const userActivityRef = (0, firestore_1.doc)(firebase_1.db, USER_ACTIVITY_COLLECTION, userId);
    const updates = {
        lastMealTimestamp: timestamp,
        totalMealsLogged: (0, firestore_1.increment)(1),
        lastUpdated: timestamp,
    };
    if (hasPhoto) {
        updates.totalPhotosLogged = (0, firestore_1.increment)(1);
    }
    await (0, firestore_1.updateDoc)(userActivityRef, updates);
    // Trigger achievement checks
    await (0, achievementTriggers_1.onMealLogged)({
        userId,
        timestamp,
        calories,
        hasPhoto,
    });
}
async function updateUserStatsOnMealLog(userId, calories, date) {
    const dailyStatsRef = (0, firestore_1.doc)(firebase_1.db, USER_STATS_COLLECTION, userId, "daily", date.toISOString().split("T")[0]);
    try {
        const docSnap = await (0, firestore_1.getDoc)(dailyStatsRef);
        let targetCalories = 2000; // Default or fetch from user profile
        if (docSnap.exists()) {
            targetCalories = docSnap.data().targetCalories || targetCalories;
            await (0, firestore_1.updateDoc)(dailyStatsRef, {
                caloriesConsumed: (0, firestore_1.increment)(calories),
            });
        }
        else {
            // Fetch target calories from user profile if creating new stats doc
            // const userProfile = await getUserProfile(userId); // Assuming getUserProfile exists
            // targetCalories = userProfile?.goals?.calories || 2000;
            await (0, firestore_1.setDoc)(dailyStatsRef, {
                caloriesConsumed: calories,
                targetCalories: targetCalories, // Set target when creating
                date: date,
            });
        }
        // Recalculate total calories after update/set
        const updatedSnap = await (0, firestore_1.getDoc)(dailyStatsRef);
        const actualCalories = updatedSnap.data()?.caloriesConsumed || 0;
        // Calculate metGoal before calling the trigger
        const metGoal = Math.abs(targetCalories - actualCalories) <= targetCalories * 0.1; // 10% margin
        // Call the trigger with the correct CalorieGoalData structure
        await (0, achievementTriggers_1.onCalorieGoalMet)({
            userId,
            date: date,
            metGoal: metGoal,
            targetCalories: targetCalories,
            actualCalories: actualCalories,
        });
    }
    catch (error) {
        console.error("Error updating user stats or triggering achievement:", error);
    }
}
async function trackWeightEntry(userId, weight, date = new Date()) {
    const userActivityRef = (0, firestore_1.doc)(firebase_1.db, USER_ACTIVITY_COLLECTION, userId);
    await (0, firestore_1.updateDoc)(userActivityRef, {
        weightEntriesCount: (0, firestore_1.increment)(1),
        lastUpdated: date,
    });
}
async function trackCustomRecipe(userId, date = new Date()) {
    const userActivityRef = (0, firestore_1.doc)(firebase_1.db, USER_ACTIVITY_COLLECTION, userId);
    await (0, firestore_1.updateDoc)(userActivityRef, {
        customRecipesCreated: (0, firestore_1.increment)(1),
        lastUpdated: date,
    });
}
async function processDailyReset(userId) {
    const userActivityRef = (0, firestore_1.doc)(firebase_1.db, USER_ACTIVITY_COLLECTION, userId);
    await (0, firestore_1.updateDoc)(userActivityRef, {
        dailyMealCount: 0,
        lastUpdated: (0, firestore_1.serverTimestamp)(),
    });
    // Check for daily streak achievements
    await (0, achievementTriggers_1.onDailyActivityCompleted)(userId);
}
// Helper function to check if two dates are the same day
function isSameDay(date1, date2) {
    return (date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate());
}
