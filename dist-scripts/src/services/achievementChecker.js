"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAchievements = checkAchievements;
const achievementService_1 = require("./achievementService");
const firestore_1 = require("firebase/firestore");
async function checkAchievements(db, userId, action, data) {
    // Get user's current achievements
    const userAchievements = await (0, achievementService_1.getUserAchievements)(db, userId);
    if (!userAchievements)
        return;
    // Get all achievements from Firestore
    const achievementsRef = (0, firestore_1.collection)(db, "achievements");
    const achievementsSnapshot = await (0, firestore_1.getDocs)((0, firestore_1.query)(achievementsRef, (0, firestore_1.where)("criteria.action", "==", action)));
    // Check each relevant achievement
    for (const doc of achievementsSnapshot.docs) {
        const achievement = doc.data();
        // Skip if already earned
        if (userAchievements.earnedAchievements.includes(achievement.id))
            continue;
        const result = await checkSingleAchievement(userId, achievement, data, userAchievements);
        if (result.achieved) {
            // Award the achievement
            await (0, achievementService_1.awardAchievement)(db, userId, achievement.id, userAchievements.totalPoints + (achievement.reward?.points || 0));
        }
        else if (result.progress) {
            // Update progress
            await (0, achievementService_1.updateAchievementProgress)(db, userId, achievement.id, result.progress);
        }
    }
}
async function checkSingleAchievement(userId, achievement, data, userAchievements) {
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
function checkSingleTypeAchievement(achievement, data) {
    // Check conditions if they exist
    if (achievement.criteria.conditions) {
        for (const [key, value] of Object.entries(achievement.criteria.conditions)) {
            if (data[key] !== value) {
                return { achieved: false };
            }
        }
    }
    return { achieved: true };
}
function checkCumulativeAchievement(achievement, progress) {
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
function checkStreakAchievement(achievement, progress, data) {
    const lastUpdate = progress.lastUpdated?.toDate() || new Date(0);
    const today = new Date();
    const isConsecutiveDay = lastUpdate.getDate() === today.getDate() - 1 || !progress.lastUpdated; // First entry
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
function checkSocialAchievement(achievement, data) {
    // Implement social achievement logic here
    // This could involve checking friend counts, shares, etc.
    return { achieved: false };
}
