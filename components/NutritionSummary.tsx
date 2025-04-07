import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface MacroData {
  current: number;
  goal: number;
  percent: number;
}

interface NutritionSummaryProps {
  date: string;
  caloriesRemaining: number;
  caloriesGoal: number;
  percentRemaining: number;
  protein: MacroData;
  carbs: MacroData;
}

export default function NutritionSummary({
  date,
  caloriesRemaining,
  caloriesGoal,
  percentRemaining,
  protein,
  carbs,
}: NutritionSummaryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.dateHeader}>{date}</Text>

      <View style={styles.summaryCard}>
        <View style={styles.calorieSection}>
          <View style={styles.textSection}>
            <Text style={styles.sectionTitle}>Calories Remaining</Text>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieValue}>{caloriesRemaining}</Text>
              <Text style={styles.calorieGoal}> / {caloriesGoal}</Text>
            </View>
          </View>

          <View style={styles.percentCircle}>
            <Text style={styles.percentText}>{percentRemaining}%</Text>
          </View>
        </View>

        <View style={styles.macroSection}>
          <Text style={styles.macroTitle}>Protein</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${protein.percent}%`, backgroundColor: "#d9534f" },
              ]}
            />
          </View>
          <Text style={styles.macroValues}>
            {protein.current}g / {protein.goal}g
          </Text>
        </View>

        <View style={styles.macroSection}>
          <Text style={styles.macroTitle}>Carbs</Text>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${carbs.percent}%`, backgroundColor: "#f0ad4e" },
              ]}
            />
          </View>
          <Text style={styles.macroValues}>
            {carbs.current}g / {carbs.goal}g
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  dateHeader: {
    fontSize: 28,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  calorieSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  textSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#333",
    marginBottom: 5,
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  calorieValue: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#222",
  },
  calorieGoal: {
    fontSize: 24,
    color: "#888",
  },
  percentCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  percentText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  macroSection: {
    marginBottom: 20,
  },
  macroTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 6,
  },
  macroValues: {
    fontSize: 16,
    color: "#666",
  },
});
