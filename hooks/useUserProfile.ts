import { useState, useEffect } from "react";
import {
  UserProfileService,
  UserProfile,
  Achievement,
} from "../services/UserProfileService";
import { db } from "../firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const profileService = UserProfileService.getInstance();
    const userProfileRef = doc(db, "userProfiles", userId);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userProfileRef,
      async (doc) => {
        try {
          setLoading(true);
          if (!doc.exists()) {
            console.log("Profile does not exist, initializing...");
            // Initialize profile if it doesn't exist
            const newProfile = await profileService.initializeUserProfile(
              userId,
              {}
            );
            setProfile(newProfile);
          } else {
            console.log("Profile exists, setting data...");
            setProfile(doc.data() as UserProfile);
          }
          setError(null);
        } catch (err) {
          console.error("Error in profile listener:", err);
          setError(
            err instanceof Error ? err : new Error("Failed to fetch profile")
          );
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error in onSnapshot:", err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [userId]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return;

    try {
      console.log("Updating profile with:", updates);
      const profileService = UserProfileService.getInstance();
      await profileService.updateUserProfile(userId, updates);
      // No need to setProfile here as onSnapshot will handle the update
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to update profile")
      );
      throw err;
    }
  };

  const addAchievement = async (achievement: Achievement) => {
    if (!userId) return;

    try {
      const profileService = UserProfileService.getInstance();
      await profileService.addAchievement(userId, achievement);
      // No need to setProfile here as onSnapshot will handle the update
    } catch (err) {
      console.error("Error adding achievement:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to add achievement")
      );
      throw err;
    }
  };

  const updateSubscriptionTier = async (tier: "free" | "premium") => {
    if (!userId) return;

    try {
      const profileService = UserProfileService.getInstance();
      await profileService.updateSubscriptionTier(userId, tier);
      // No need to setProfile here as onSnapshot will handle the update
    } catch (err) {
      console.error("Error updating subscription:", err);
      setError(
        err instanceof Error ? err : new Error("Failed to update subscription")
      );
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
    addAchievement,
    updateSubscriptionTier,
  };
}
