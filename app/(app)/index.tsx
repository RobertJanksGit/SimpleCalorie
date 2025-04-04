import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

// Mock data - replace with real data later
const dailySummary = {
  caloriesRemaining: 1370,
  caloriesGoal: 2000,
  protein: { current: 59, goal: 120 },
  carbs: { current: 55, goal: 250 },
  fat: { current: 20, goal: 65 },
};

const meals = [
  {
    type: "Breakfast",
    name: "Protein Smoothie",
    time: "4:57 PM",
    calories: 280,
    protein: 24,
    carbs: 30,
    fat: 8,
  },
  {
    type: "Lunch",
    name: "Grilled Chicken Salad",
    time: "4:57 PM",
    calories: 350,
    protein: 35,
    carbs: 25,
    fat: 12,
  },
];

export default function HomeScreen() {
  const percentageComplete = Math.round(
    (dailySummary.caloriesRemaining / dailySummary.caloriesGoal) * 100
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Date Header */}
        <Text style={styles.dateHeader}>Thursday, April 3</Text>

        {/* Daily Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>Calories Remaining</Text>
              <View style={styles.caloriesContainer}>
                <Text style={styles.caloriesRemaining}>
                  {dailySummary.caloriesRemaining}
                </Text>
                <Text style={styles.caloriesGoal}>
                  / {dailySummary.caloriesGoal}
                </Text>
              </View>
            </View>
            <View style={styles.percentageContainer}>
              <Text style={styles.percentageText}>{percentageComplete}%</Text>
            </View>
          </View>

          {/* Macros */}
          <View style={styles.macrosContainer}>
            <MacroProgress
              label="Protein"
              current={dailySummary.protein.current}
              goal={dailySummary.protein.goal}
              color="#FF6B6B"
            />
            <MacroProgress
              label="Carbs"
              current={dailySummary.carbs.current}
              goal={dailySummary.carbs.goal}
              color="#4ECDC4"
            />
            <MacroProgress
              label="Fat"
              current={dailySummary.fat.current}
              goal={dailySummary.fat.goal}
              color="#FFD93D"
            />
          </View>
        </View>

        {/* Add Meal Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.addButton} onPress={() => {}}>
            <Ionicons name="add" size={24} color="#4CAF50" />
            <Text style={styles.addButtonText}>Add Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.snapButton}
            onPress={() => router.push("/camera")}
          >
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.snapButtonText}>Snap Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Meals */}
        <Text style={styles.sectionTitle}>Today's Meals</Text>
        {meals.map((meal, index) => (
          <View key={index} style={styles.mealCard}>
            <View>
              <Text style={styles.mealType}>{meal.type}</Text>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.macroText}>
                Protein: {meal.protein}g Carbs: {meal.carbs}g Fat: {meal.fat}g
              </Text>
            </View>
            <View style={styles.mealRight}>
              <Text style={styles.mealTime}>{meal.time}</Text>
              <Text style={styles.mealCalories}>{meal.calories} cal</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// Macro Progress Component
function MacroProgress({ label, current, goal, color }) {
  const progress = (current / goal) * 100;
  return (
    <View style={styles.macroProgress}>
      <Text style={styles.macroLabel}>{label}</Text>
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${progress}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.macroValues}>
        {current}g / {goal}g
      </Text>
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
    padding: 16,
  },
  dateHeader: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  caloriesContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  caloriesRemaining: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  caloriesGoal: {
    fontSize: 16,
    color: "#666",
    marginLeft: 4,
  },
  percentageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  percentageText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  macrosContainer: {
    gap: 12,
  },
  macroProgress: {
    gap: 4,
  },
  macroLabel: {
    fontSize: 14,
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
  macroValues: {
    fontSize: 12,
    color: "#666",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    gap: 8,
  },
  snapButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "500",
  },
  snapButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  mealCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  mealName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  macroText: {
    fontSize: 12,
    color: "#888",
  },
  mealRight: {
    alignItems: "flex-end",
  },
  mealTime: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
});
