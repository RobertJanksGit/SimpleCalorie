import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
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
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { router } from "expo-router";

interface DailyTotal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
  lastUpdated?: string;
}

interface Meal {
  id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
  photoUrl?: string;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<{ [date: string]: DailyTotal }>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedDayData, setSelectedDayData] = useState<DailyTotal | null>(
    null
  );
  const [selectedDayMeals, setSelectedDayMeals] = useState<Meal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);

  // Get the start of the current week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start from Monday

  useEffect(() => {
    let isMounted = true;

    async function fetchWeeklyData() {
      if (!user?.uid) return;

      try {
        const weekDates = Array.from({ length: 7 }, (_, i) => {
          const date = addDays(weekStart, i);
          return format(date, "yyyy-MM-dd");
        });

        // Create an object with default values for each day
        const defaultData = weekDates.reduce((acc, date) => {
          acc[date] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            meals: 0,
          };
          return acc;
        }, {} as { [date: string]: DailyTotal });

        // Get all daily totals for the user for this week
        const dailyTotalsRef = collection(db, `users/${user.uid}/dailyTotals`);
        const q = query(
          dailyTotalsRef,
          where("lastUpdated", ">=", weekDates[0]),
          where("lastUpdated", "<=", weekDates[6] + "T23:59:59Z"),
          orderBy("lastUpdated", "desc")
        );

        // Set up real-time listener for the current week
        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            snapshot.forEach((doc) => {
              const date = doc.id;
              if (weekDates.includes(date)) {
                const data = doc.data();
                defaultData[date] = {
                  calories: data.calories || 0,
                  protein: data.protein || 0,
                  carbs: data.carbs || 0,
                  fat: data.fat || 0,
                  meals: data.meals || 0,
                  lastUpdated: data.lastUpdated,
                };
              }
            });

            if (isMounted) {
              setWeeklyData(defaultData);
              // Update selected day data if it exists
              const formattedSelectedDate = format(selectedDate, "yyyy-MM-dd");
              setSelectedDayData(defaultData[formattedSelectedDate] || null);
              setLoading(false);
            }
          },
          (error) => {
            console.error("Error fetching weekly data:", error);
            if (isMounted) {
              setLoading(false);
            }
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up weekly data listener:", error);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    setLoading(true);
    fetchWeeklyData();

    return () => {
      isMounted = false;
    };
  }, [user?.uid, weekStart.getTime(), selectedDate]); // Added selectedDate dependency

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedDate((current) => {
      const days = direction === "prev" ? -7 : 7;
      return addDays(current, days);
    });
  };

  const fetchMealsForDate = async (date: Date) => {
    if (!user?.uid) return;

    setLoadingMeals(true);
    try {
      const formattedDate = format(date, "yyyy-MM-dd");
      const mealsRef = collection(
        db,
        `users/${user.uid}/logs/${formattedDate}/meals`
      );
      const q = query(mealsRef, orderBy("timestamp", "desc"));

      const snapshot = await getDocs(q);
      const meals = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            foodName: data.foodName || "Unknown meal",
            calories: data.calories || 0,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fat: data.fat || 0,
            timestamp: data.timestamp,
            photoUrl: data.photoUrl,
          };
        })
        .filter((meal) => meal.calories > 0); // Filter out empty meals

      setSelectedDayMeals(meals);
    } catch (error) {
      console.error("Error fetching meals:", error);
    } finally {
      setLoadingMeals(false);
    }
  };

  const handleDaySelect = (date: Date) => {
    setSelectedDate(date);
    const formattedDate = format(date, "yyyy-MM-dd");
    setSelectedDayData(weeklyData[formattedDate] || null);
    fetchMealsForDate(date);
  };

  const renderDayCard = (date: Date, data: DailyTotal) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    const dayName = format(date, "EEE");
    const dayNumber = format(date, "d");
    const isToday = format(new Date(), "yyyy-MM-dd") === formattedDate;
    const isSelected = isSameDay(date, selectedDate);
    const hasData = data.calories > 0;

    return (
      <TouchableOpacity
        key={formattedDate}
        style={[
          styles.dayCard,
          hasData && !isSelected && styles.hasDataCard,
          isSelected && styles.selectedCard,
          isToday && !isSelected && styles.todayBorder,
        ]}
        activeOpacity={0.7}
        onPress={() => handleDaySelect(date)}
      >
        <Text
          style={[
            styles.dayName,
            isSelected && styles.todayText,
            isToday && !isSelected && styles.todayColor,
          ]}
        >
          {dayName}
        </Text>
        <Text
          style={[
            styles.dayNumber,
            isSelected && styles.todayText,
            isToday && !isSelected && styles.todayColor,
          ]}
        >
          {dayNumber}
        </Text>
        <View style={styles.calorieContainer}>
          <Text
            style={[
              styles.calorieText,
              isSelected && styles.todayText,
              isToday && !isSelected && styles.todayColor,
            ]}
          >
            {data.calories}
          </Text>
          <Text
            style={[
              styles.calorieSuffix,
              isSelected && styles.todayText,
              isToday && !isSelected && styles.todayColor,
            ]}
          >
            cal
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Memoize the weekly summary calculations
  const weeklySummary = React.useMemo(() => {
    const totalCalories = Object.values(weeklyData).reduce(
      (sum, day) => sum + (day.calories || 0),
      0
    );
    const totalMeals = Object.values(weeklyData).reduce(
      (sum, day) => sum + (day.meals || 0),
      0
    );
    const dailyAverage = Math.round(totalCalories / 7);

    return {
      totalCalories,
      totalMeals,
      dailyAverage,
    };
  }, [weeklyData]);

  const renderSelectedDayDetails = () => {
    if (!selectedDayData) return null;

    return (
      <View style={styles.selectedDayCard}>
        <Text style={styles.selectedDayTitle}>
          {format(selectedDate, "EEEE, MMMM d")}
        </Text>
        <View style={styles.selectedDayStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedDayData.calories}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedDayData.protein}g</Text>
            <Text style={styles.statLabel}>Protein</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedDayData.carbs}g</Text>
            <Text style={styles.statLabel}>Carbs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{selectedDayData.fat}g</Text>
            <Text style={styles.statLabel}>Fat</Text>
          </View>
        </View>

        {/* Meals Section */}
        <View style={styles.mealsSection}>
          <View style={styles.mealsSectionHeader}>
            <Ionicons name="restaurant-outline" size={20} color="#666" />
            <Text style={styles.mealsSectionTitle}>
              {selectedDayData.meals} meal
              {selectedDayData.meals !== 1 ? "s" : ""} logged
            </Text>
          </View>

          {loadingMeals ? (
            <ActivityIndicator
              size="small"
              color="#4CAF50"
              style={styles.mealsLoader}
            />
          ) : selectedDayMeals.length > 0 ? (
            <View style={styles.mealsList}>
              {selectedDayMeals.map((meal) => (
                <View key={meal.id} style={styles.mealItem}>
                  {meal.photoUrl && (
                    <Image
                      source={{ uri: meal.photoUrl }}
                      style={styles.mealPhoto}
                    />
                  )}
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.foodName}</Text>
                    <Text style={styles.mealTime}>
                      {format(new Date(meal.timestamp), "h:mm a")}
                    </Text>
                    <Text style={styles.mealMacros}>
                      {meal.calories} cal • {meal.protein}g protein •{" "}
                      {meal.carbs}g carbs • {meal.fat}g fat
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noMealsText}>No meals logged for this day</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Week Navigation */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity onPress={() => navigateWeek("prev")}>
              <Ionicons name="chevron-back" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.weekText}>
              {format(weekStart, "MMMM d")} -{" "}
              {format(addDays(weekStart, 6), "MMMM d, yyyy")}
            </Text>
            <TouchableOpacity onPress={() => navigateWeek("next")}>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Days Grid */}
          <View style={[styles.daysGrid, { marginBottom: 24 }]}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = addDays(weekStart, i);
              const formattedDate = format(date, "yyyy-MM-dd");
              return renderDayCard(
                date,
                weeklyData[formattedDate] || {
                  calories: 0,
                  protein: 0,
                  carbs: 0,
                  fat: 0,
                  meals: 0,
                }
              );
            })}
          </View>

          {/* Weekly Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Weekly Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {weeklySummary.totalCalories}
                </Text>
                <Text style={styles.summaryLabel}>Total Calories</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {weeklySummary.totalMeals}
                </Text>
                <Text style={styles.summaryLabel}>Total Meals</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {weeklySummary.dailyAverage}
                </Text>
                <Text style={styles.summaryLabel}>Daily Average</Text>
              </View>
            </View>
          </View>

          {/* Selected Day Details */}
          {renderSelectedDayDetails()}
        </ScrollView>
      )}

      {/* Bottom Tab Bar */}
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: "white" }}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/")}
          >
            <Ionicons name="home-outline" size={24} color="#666" />
            <Text style={styles.tabText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="time" size={24} color="#4CAF50" />
            <Text style={[styles.tabText, { color: "#4CAF50" }]}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, styles.chatTab]}
            onPress={() => router.push("/?openChat=true")}
            activeOpacity={0.7}
          >
            <View style={styles.chatButton}>
              <Ionicons name="chatbubble" size={24} color="white" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="stats-chart" size={24} color="#666" />
            <Text style={styles.tabText}>Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="person-outline" size={24} color="#666" />
            <Text style={styles.tabText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  weekNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    marginBottom: 8,
  },
  weekText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    justifyContent: "space-between",
    marginHorizontal: 8,
  },
  dayCard: {
    width: "13%",
    aspectRatio: 0.8,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
    marginBottom: 8,
    marginHorizontal: "0.25%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  todayCard: {
    backgroundColor: "#4CAF50",
  },
  selectedCard: {
    backgroundColor: "#4CAF50",
    transform: [{ scale: 1.05 }],
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  hasDataCard: {
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  dayName: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  todayText: {
    color: "white",
  },
  calorieContainer: {
    alignItems: "center",
  },
  calorieText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  calorieSuffix: {
    fontSize: 10,
    color: "#666",
  },
  selectedDayCard: {
    backgroundColor: "white",
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDayTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  selectedDayStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  mealCount: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  mealCountText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  summaryCard: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  summaryContent: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
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
  todayBorder: {
    borderWidth: 2,
    borderColor: "#4CAF50",
    backgroundColor: "white",
  },
  todayColor: {
    color: "#4CAF50",
  },
  mealsSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  mealsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mealsSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  mealsLoader: {
    marginVertical: 20,
  },
  mealsList: {
    gap: 12,
  },
  mealItem: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  mealPhoto: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  mealMacros: {
    fontSize: 12,
    color: "#666",
  },
  noMealsText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    fontStyle: "italic",
    marginVertical: 20,
  },
});
