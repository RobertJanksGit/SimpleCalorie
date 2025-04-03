import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";

interface MealSection {
  title: string;
  calories: number;
}

export default function HomeScreen() {
  const { signOut } = useAuth();

  const mealSections: MealSection[] = [
    { title: "BREAKFAST", calories: 422 },
    { title: "LUNCH", calories: 528 },
    { title: "DINNER", calories: 739 },
    { title: "SNACKS", calories: 422 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Text style={styles.premiumText}>Go Premium</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home</Text>
        <TouchableOpacity onPress={signOut}>
          <Ionicons name="person-outline" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Calories Summary */}
        <View style={styles.caloriesContainer}>
          <Text style={styles.caloriesTitle}>CALORIES</Text>
          <View style={styles.caloriesGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>BUDGET</Text>
              <Text style={styles.gridValue}>2110</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>FOOD</Text>
              <Text style={styles.gridValue}>0</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>EXERCISE</Text>
              <Text style={styles.gridValue}>0</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>NET</Text>
              <Text style={styles.gridValue}>0</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.gridLabel, { color: "#4CAF50" }]}>
                UNDER
              </Text>
              <Text style={[styles.gridValue, { color: "#4CAF50" }]}>2110</Text>
            </View>
          </View>
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoText}>70% off</Text>
          <View style={styles.timerContainer}>
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>23</Text>
            </View>
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>58</Text>
            </View>
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>43</Text>
            </View>
          </View>
        </View>

        {/* Meal Sections */}
        {mealSections.map((section, index) => (
          <View key={index} style={styles.mealSection}>
            <View>
              <Text style={styles.mealTitle}>{section.title}</Text>
              <Text style={styles.mealCalories}>
                {section.calories} calories suggested
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                router.push({
                  pathname: "./camera",
                  params: { mealType: section.title.toLowerCase() },
                })
              }
            >
              <Text style={styles.addButtonText}>
                ADD {section.title.toLowerCase()}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#007AFF" />
          <Text style={[styles.navText, { color: "#007AFF" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push({
              pathname: "./camera",
              params: { mealType: "breakfast" },
            })
          }
        >
          <Ionicons name="camera-outline" size={24} color="#666" />
          <Text style={styles.navText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.navText}>Me</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFDFD",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  premiumText: {
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  caloriesContainer: {
    padding: 16,
  },
  caloriesTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  caloriesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  gridItem: {
    alignItems: "center",
  },
  gridLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
  promoBanner: {
    backgroundColor: "#E8F5F3",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  promoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00796B",
  },
  timerContainer: {
    flexDirection: "row",
    gap: 8,
  },
  timerBox: {
    backgroundColor: "#00796B",
    padding: 8,
    borderRadius: 4,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  mealSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  mealCalories: {
    fontSize: 14,
    color: "#666",
  },
  addButton: {
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: "#007AFF",
    fontWeight: "500",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    backgroundColor: "white",
  },
  navItem: {
    alignItems: "center",
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: "#666",
  },
});
