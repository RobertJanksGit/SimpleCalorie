import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { getLocalDate } from "../utils/dateUtils";

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  meals: number;
  lastUpdated?: string;
}

interface UserGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const BASE_CALORIES = 2200; // Base maintenance calories

const WEEKLY_RATES = [
  { value: "maintain", label: "Maintain", dailyDeficit: 0 },
  { value: "0.5", label: "Lose 1/2 lb", dailyDeficit: 250 },
  { value: "1.0", label: "Lose 1 lb", dailyDeficit: 500 },
  { value: "1.5", label: "Lose 1 1/2 lb", dailyDeficit: 750 },
  { value: "2.0", label: "Lose 2 lb", dailyDeficit: 1000 },
] as const;

const DEFAULT_GOALS: UserGoals = {
  calories: BASE_CALORIES, // This will be updated based on weekly rate
  protein: 120,
  carbs: 250,
  fat: 65,
};

export function useDailyTotals(userId: string) {
  const [totals, setTotals] = useState<DailyTotals | null>(null);
  const [goals, setGoals] = useState<UserGoals>(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setError("No user ID provided");
      setLoading(false);
      return;
    }

    const date = getLocalDate();
    const totalsRef = doc(db, `users/${userId}/dailyTotals/${date}`);
    const goalsRef = doc(db, `users/${userId}/settings/goals`);
    const userProfileRef = doc(db, "userProfiles", userId);

    // Fetch user goals and weekly rate
    const fetchGoals = async () => {
      try {
        // Get user profile to check weekly rate
        const profileDoc = await getDoc(userProfileRef);
        const weeklyRate = profileDoc.exists()
          ? profileDoc.data().weeklyRate
          : "maintain";

        // Calculate calorie goal based on weekly rate
        const rateSettings =
          WEEKLY_RATES.find((r) => r.value === weeklyRate) || WEEKLY_RATES[0];
        const calculatedCalories = BASE_CALORIES - rateSettings.dailyDeficit;

        // Get other goals from settings
        const goalsDoc = await getDoc(goalsRef);
        if (goalsDoc.exists()) {
          const goalsData = goalsDoc.data() as UserGoals;
          setGoals({
            ...goalsData,
            calories: calculatedCalories, // Override calories with calculated value
          });
        } else {
          // If no goals exist, use defaults with calculated calories
          setGoals({
            ...DEFAULT_GOALS,
            calories: calculatedCalories,
          });
        }
      } catch (err) {
        console.error("Error fetching goals:", err);
        // Keep default goals on error
      }
    };

    fetchGoals();

    // Set up real-time listener for daily totals
    const unsubscribe = onSnapshot(
      totalsRef,
      (doc) => {
        setLoading(false);
        if (doc.exists()) {
          const data = doc.data();
          console.log("Daily totals document exists:", {
            path: doc.ref.path,
            data: data,
            timestamp: new Date().toISOString(),
          });
          setTotals({
            calories: data.calories || 0,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fat: data.fat || 0,
            fiber: data.fiber || 0,
            sugar: data.sugar || 0,
            meals: data.meals || 0,
            lastUpdated: data.lastUpdated,
          });
        } else {
          console.log("No daily totals document exists for today:", {
            path: doc.ref.path,
            timestamp: new Date().toISOString(),
          });
          // Initialize with zeros if no document exists
          setTotals({
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            meals: 0,
          });
        }
      },
      (err) => {
        console.error("Error in daily totals listener:", {
          error: err,
          userId: userId,
          timestamp: new Date().toISOString(),
        });
        setError("Failed to fetch daily totals");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const getRemainingCalories = () => {
    if (!totals) return goals.calories;
    return goals.calories - totals.calories;
  };

  const getMacroPercentages = () => {
    if (!totals) return { protein: 0, carbs: 0, fat: 0 };
    return {
      protein: Math.round((totals.protein / goals.protein) * 100),
      carbs: Math.round((totals.carbs / goals.carbs) * 100),
      fat: Math.round((totals.fat / goals.fat) * 100),
    };
  };

  return {
    totals,
    goals,
    loading,
    error,
    getRemainingCalories,
    getMacroPercentages,
  };
}
