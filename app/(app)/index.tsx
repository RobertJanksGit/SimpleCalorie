import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { PhotoService } from "../../services/PhotoService";
import { useAuth } from "../../contexts/AuthContext";

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

// Add interfaces
interface MacroProgressProps {
  label: string;
  current: number;
  goal: number;
  color: string;
}

interface Meal {
  type: string;
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const percentageComplete = Math.round(
    (dailySummary.caloriesRemaining / dailySummary.caloriesGoal) * 100
  );

  const handleUploadMeal = async () => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        alert("You need to enable photo library permissions to upload meals.");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        // Upload the selected photo
        const photoService = PhotoService.getInstance();
        await photoService.retryUpload(
          result.assets[0].uri,
          user.uid,
          "upload"
        );

        // Navigate back after successful upload
        router.back();
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
          <TouchableOpacity style={styles.addButton} onPress={handleUploadMeal}>
            <Ionicons name="cloud-upload" size={24} color="#4CAF50" />
            <Text style={styles.addButtonText}>Upload Meal</Text>
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
        {meals.map((meal, index) => {
          const key = `meal-${index}`;
          return (
            <View style={styles.mealCard} key={key}>
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
          );
        })}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="home" size={24} color="#4CAF50" />
          <Text style={[styles.tabText, { color: "#4CAF50" }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, styles.chatTab]}>
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
    </View>
  );
}

// Update MacroProgress component with types
function MacroProgress({ label, current, goal, color }: MacroProgressProps) {
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
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingTop: 8,
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
