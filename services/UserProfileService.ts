import { db } from "../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  increment,
  FirestoreError,
} from "firebase/firestore";

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  earnedAt?: string;
  progress?: number;
  requiredProgress?: number;
}

export interface UserProfile {
  username: string;
  photoURL: string;
  achievements: Achievement[];
  subscriptionTier: "free" | "premium";
  streak: {
    current: number;
    lastUpdated: string;
    best: number;
  };
  weightGoals?: {
    startDate: string;
    startWeight: number;
    currentWeight: number;
    goalWeight: number;
  };
  weeklyRate?: "maintain" | "0.5" | "1.0" | "1.5" | "2.0";
}

export class UserProfileService {
  private static instance: UserProfileService;
  private readonly COLLECTION_NAME = "userProfiles";
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  private constructor() {}

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = this.MAX_RETRIES
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof FirestoreError &&
        error.code === "permission-denied" &&
        retries > 0
      ) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof FirestoreError) {
      switch (error.code) {
        case "permission-denied":
          throw new Error(
            `Access denied: You don't have permission to ${operation}. Please check if you're logged in.`
          );
        case "not-found":
          throw new Error(`Profile not found. Please try again.`);
        case "failed-precondition":
          throw new Error(
            `Network error: Please check your internet connection and try again.`
          );
        default:
          throw new Error(`Failed to ${operation}. Please try again later.`);
      }
    }
    // If it's not a FirestoreError, throw a generic error
    throw new Error(
      `An unexpected error occurred while trying to ${operation}.`
    );
  }

  async initializeUserProfile(
    userId: string,
    initialData: Partial<UserProfile>
  ): Promise<UserProfile> {
    try {
      const userProfileRef = doc(db, this.COLLECTION_NAME, userId);
      const defaultProfile: UserProfile = {
        username: initialData.username || "User",
        photoURL: initialData.photoURL || "",
        achievements: [],
        subscriptionTier: "free",
        streak: {
          current: 0,
          lastUpdated: new Date().toISOString(),
          best: 0,
        },
      };

      await this.retryOperation(() => setDoc(userProfileRef, defaultProfile));
      return defaultProfile;
    } catch (error) {
      this.handleError(error, "initialize profile");
    }
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userProfileRef = doc(db, this.COLLECTION_NAME, userId);
      const userProfileDoc = await this.retryOperation(() =>
        getDoc(userProfileRef)
      );

      if (!userProfileDoc.exists()) {
        return null;
      }

      return userProfileDoc.data() as UserProfile;
    } catch (error) {
      this.handleError(error, "fetch profile");
    }
  }

  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    try {
      const userProfileRef = doc(db, this.COLLECTION_NAME, userId);
      await this.retryOperation(() => updateDoc(userProfileRef, updates));
    } catch (error) {
      this.handleError(error, "update profile");
    }
  }

  async addAchievement(
    userId: string,
    achievement: Achievement
  ): Promise<void> {
    try {
      const userProfileRef = doc(db, this.COLLECTION_NAME, userId);
      await this.retryOperation(() =>
        updateDoc(userProfileRef, {
          achievements: arrayUnion({
            ...achievement,
            earnedAt: new Date().toISOString(),
          }),
        })
      );
    } catch (error) {
      this.handleError(error, "add achievement");
    }
  }

  async updateStreak(userId: string): Promise<void> {
    try {
      const userProfileRef = doc(db, this.COLLECTION_NAME, userId);
      const profile = await this.getUserProfile(userId);

      if (!profile) return;

      const lastUpdated = new Date(profile.streak.lastUpdated);
      const today = new Date();
      const diffDays = Math.floor(
        (today.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
      );

      let newStreak = profile.streak.current;
      if (diffDays === 1) {
        // Increment streak if last update was yesterday
        newStreak += 1;
      } else if (diffDays > 1) {
        // Reset streak if more than a day has passed
        newStreak = 0;
      }

      await this.retryOperation(() =>
        updateDoc(userProfileRef, {
          streak: {
            current: newStreak,
            lastUpdated: today.toISOString(),
            best: Math.max(newStreak, profile.streak.best),
          },
        })
      );
    } catch (error) {
      this.handleError(error, "update streak");
    }
  }

  async updateSubscriptionTier(
    userId: string,
    tier: "free" | "premium"
  ): Promise<void> {
    try {
      const userProfileRef = doc(db, this.COLLECTION_NAME, userId);
      await this.retryOperation(() =>
        updateDoc(userProfileRef, {
          subscriptionTier: tier,
        })
      );
    } catch (error) {
      this.handleError(error, "update subscription");
    }
  }
}
