import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { doc, onSnapshot, getDoc } from "firebase/firestore";

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

const DEFAULT_GOALS: UserGoals = {
  calories: 2000,
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

    const date = new Date().toISOString().split("T")[0];
    const totalsRef = doc(db, `users/${userId}/dailyTotals/${date}`);
    const goalsRef = doc(db, `users/${userId}/settings/goals`);

    // Fetch user goals
    const fetchGoals = async () => {
      try {
        const goalsDoc = await getDoc(goalsRef);
        if (goalsDoc.exists()) {
          setGoals(goalsDoc.data() as UserGoals);
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
          console.log("Received daily totals update:", data); // Debug log
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
        console.error("Error in daily totals listener:", err);
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
