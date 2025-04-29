"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeUserAchievements = initializeUserAchievements;
exports.awardAchievement = awardAchievement;
exports.updateAchievementProgress = updateAchievementProgress;
exports.getUserAchievements = getUserAchievements;
exports.createAchievement = createAchievement;
const firestore_1 = require("firebase/firestore");
const ACHIEVEMENTS_COLLECTION = "achievements";
const USER_ACHIEVEMENTS_COLLECTION = "userAchievements";
async function initializeUserAchievements(db, userId) {
    const userAchievementsRef = (0, firestore_1.doc)(db, USER_ACHIEVEMENTS_COLLECTION, userId);
    const initialData = {
        userId,
        earnedAchievements: [],
        progressTrackers: {},
        totalPoints: 0,
    };
    await (0, firestore_1.setDoc)(userAchievementsRef, initialData);
}
async function awardAchievement(db, userId, achievementId, points) {
    const userAchievementsRef = (0, firestore_1.doc)(db, USER_ACHIEVEMENTS_COLLECTION, userId);
    await (0, firestore_1.updateDoc)(userAchievementsRef, {
        earnedAchievements: (0, firestore_1.arrayUnion)(achievementId),
        totalPoints: points,
        [`progressTrackers.${achievementId}`]: {
            achievementId,
            completed: true,
            lastUpdated: (0, firestore_1.serverTimestamp)(),
        },
    });
}
async function updateAchievementProgress(db, userId, achievementId, progress) {
    const userAchievementsRef = (0, firestore_1.doc)(db, USER_ACHIEVEMENTS_COLLECTION, userId);
    await (0, firestore_1.updateDoc)(userAchievementsRef, {
        [`progressTrackers.${achievementId}`]: {
            ...progress,
            lastUpdated: (0, firestore_1.serverTimestamp)(),
        },
    });
}
async function getUserAchievements(db, userId) {
    const userAchievementsRef = (0, firestore_1.doc)(db, USER_ACHIEVEMENTS_COLLECTION, userId);
    const snapshot = await (0, firestore_1.getDoc)(userAchievementsRef);
    if (!snapshot.exists()) {
        return null;
    }
    return snapshot.data();
}
async function createAchievement(db, achievement) {
    const achievementRef = (0, firestore_1.doc)(db, ACHIEVEMENTS_COLLECTION, achievement.id);
    await (0, firestore_1.setDoc)(achievementRef, achievement);
}
