import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface MealItemProps {
  name: string;
  calories: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}

export default function MealItem({ name, calories, macros }: MealItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{name}</Text>
        {macros && (
          <Text style={styles.macroText}>
            {macros.protein && `Protein ${macros.protein}g`}
            {macros.carbs && macros.protein && " | "}
            {macros.carbs && `Carbs: ${macros.carbs}g`}
            {macros.fat && (macros.protein || macros.carbs) && " | "}
            {macros.fat && `Fat ${macros.fat}g`}
          </Text>
        )}
      </View>
      <Text style={styles.calories}>{calories} cal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fff",
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 4,
  },
  macroText: {
    fontSize: 14,
    color: "#666",
  },
  calories: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
