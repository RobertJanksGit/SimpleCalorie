import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
} from "firebase/firestore";
import { format, subDays } from "date-fns";
import { router } from "expo-router";
import { useDailyTotals } from "../../hooks/useDailyTotals";

interface DailyTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
  lastUpdated?: string;
  date?: string;
}

const DAYS_TO_SHOW = 7;

export default function InsightsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { totals: dailyTotals, goals } = useDailyTotals(user?.uid || "");
  const [selectedRange, setSelectedRange] = useState<"week" | "month">("week");
  const [weeklyData, setWeeklyData] = useState<DailyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTotals, setCurrentTotals] = useState<DailyTotal>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    meals: 0,
  });

  const chartData = useMemo(() => {
    // ... existing code ...
  }, [dailyTotals, selectedRange]);

  const averages = useMemo(() => {
    if (!weeklyData || weeklyData.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const numDays = weeklyData.length;
    return {
      calories: Math.round(
        weeklyData.reduce((sum, day) => sum + (day.calories || 0), 0) / numDays
      ),
      protein: Math.round(
        weeklyData.reduce((sum, day) => sum + (day.protein || 0), 0) / numDays
      ),
      carbs: Math.round(
        weeklyData.reduce((sum, day) => sum + (day.carbs || 0), 0) / numDays
      ),
      fat: Math.round(
        weeklyData.reduce((sum, day) => sum + (day.fat || 0), 0) / numDays
      ),
    };
  }, [weeklyData]);

  useEffect(() => {
    async function fetchWeeklyData() {
      if (!user?.uid) return;

      try {
        const endDate = new Date();
        const startDate = format(
          subDays(endDate, DAYS_TO_SHOW - 1),
          "yyyy-MM-dd"
        );

        const dailyTotalsRef = collection(db, `users/${user.uid}/dailyTotals`);
        const q = query(
          dailyTotalsRef,
          where("lastUpdated", ">=", startDate),
          orderBy("lastUpdated", "desc"),
          limit(DAYS_TO_SHOW)
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          ...(doc.data() as DailyTotal),
          date: doc.id,
        }));

        // Sort data by date
        data.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setWeeklyData(data);

        // Set current day totals
        const today = format(new Date(), "yyyy-MM-dd");
        const todayData = data.find((d) => d.date === today);
        if (todayData) {
          setCurrentTotals(todayData);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching insights data:", error);
        setLoading(false);
      }
    }

    fetchWeeklyData();
  }, [user?.uid]);

  const renderCalorieChart = () => {
    // Calculate max calories for the chart based on actual data or goal
    const dataMax = Math.max(0, ...weeklyData.map((day) => day.calories || 0));
    const goalMax = goals.calories || 2000;

    // Use the larger of data max or goal, with a 10% headroom, rounded to nearest 500
    const rawMax = Math.max(dataMax, goalMax) * 1.1;
    const maxCalories = Math.ceil(rawMax / 500) * 500;

    // Generate Y-axis labels in 500 calorie increments
    const yAxisLabels = [];
    for (let i = maxCalories; i >= 0; i -= 500) {
      yAxisLabels.push(i);
    }

    // Make sure we always have 0 as the bottom label
    if (yAxisLabels[yAxisLabels.length - 1] !== 0) {
      yAxisLabels.push(0);
    }

    // Get current date and calculate the Monday of the current week
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If today is Sunday, we need to go back 6 days to get to Monday

    // Set to Monday of this week
    const mondayOfWeek = new Date(today);
    mondayOfWeek.setDate(today.getDate() - daysFromMonday);

    // Define day labels in order from Monday to Sunday
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Calories</Text>

        <View style={styles.chartContent}>
          {/* Y-axis labels */}
          <View style={styles.yAxisContainer}>
            {yAxisLabels.map((value) => (
              <Text key={value} style={styles.yAxisLabel}>
                {value}
              </Text>
            ))}
          </View>

          {/* Main chart area */}
          <View style={styles.graphContainer}>
            {/* Grid lines */}
            {yAxisLabels.map((value, index) => (
              <View
                key={value}
                style={[
                  styles.gridLine,
                  index === yAxisLabels.length - 1 && styles.bottomGridLine,
                ]}
              />
            ))}

            {/* Bars */}
            <View style={styles.barsRow}>
              {dayLabels.map((day, index) => {
                // Calculate the date for this day (Monday + index days)
                const date = new Date(mondayOfWeek);
                date.setDate(mondayOfWeek.getDate() + index);
                const dateString = format(date, "yyyy-MM-dd");

                // Find the data for this date, or use 0
                const dayData = weeklyData.find((d) => d.date === dateString);
                const calories = dayData ? dayData.calories : 0;
                const heightPercentage =
                  calories > 0
                    ? Math.min((calories / maxCalories) * 100, 100)
                    : 0;

                return (
                  <View key={day + index} style={styles.barColumn}>
                    {calories > 0 && (
                      <View
                        style={[styles.bar, { height: `${heightPercentage}%` }]}
                      />
                    )}
                    <Text style={styles.dayLabel}>{day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderNutrientProgress = (
    label: string,
    current: number,
    goal: number,
    color: string
  ) => {
    const progress = Math.min((current / goal) * 100, 100);

    return (
      <View style={styles.nutrientContainer}>
        <View style={styles.nutrientHeader}>
          <Text style={styles.nutrientLabel}>{label}</Text>
          <Text style={styles.nutrientValues}>
            {current}g / {goal}g
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        {renderCalorieChart()}

        <View style={styles.nutrientsCard}>
          <Text style={styles.sectionTitle}>Weekly Average</Text>
          {renderNutrientProgress(
            "Protein",
            averages.protein,
            goals.protein,
            "#FF6B6B"
          )}
          {renderNutrientProgress(
            "Carbs",
            averages.carbs,
            goals.carbs,
            "#4ECDC4"
          )}
          {renderNutrientProgress("Fat", averages.fat, goals.fat, "#FFD93D")}
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/")}
        >
          <Ionicons name="home-outline" size={24} color="#666" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/history")}
        >
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, styles.chatTab]}
          onPress={() => {
            router.push("/");
            router.setParams({ openChat: "true" });
          }}
        >
          <View style={styles.chatButton}>
            <Ionicons name="chatbubble" size={24} color="white" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="stats-chart" size={24} color="#4CAF50" />
          <Text style={[styles.tabText, { color: "#4CAF50" }]}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/profile")}
        >
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.tabText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  chartContent: {
    flexDirection: "row",
    height: 240,
  },
  yAxisContainer: {
    width: 40,
    height: 200,
    justifyContent: "space-between",
  },
  yAxisLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    paddingRight: 8,
  },
  graphContainer: {
    flex: 1,
    height: 200,
    justifyContent: "space-between",
    position: "relative",
    marginBottom: 20, // Space for day labels below
  },
  gridLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#f0f0f0",
  },
  bottomGridLine: {
    backgroundColor: "#e0e0e0", // Slightly darker for better visibility
  },
  barsRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 10,
  },
  barColumn: {
    width: 30,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: 24,
    backgroundColor: "#4CAF50",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    position: "absolute",
    bottom: 0,
  },
  dayLabel: {
    position: "absolute",
    bottom: -20,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  nutrientsCard: {
    backgroundColor: "white",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  nutrientContainer: {
    marginBottom: 16,
  },
  nutrientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  nutrientLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  nutrientValues: {
    fontSize: 16,
    color: "#666",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    flex: 1,
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  chatTab: {
    marginTop: -20,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
