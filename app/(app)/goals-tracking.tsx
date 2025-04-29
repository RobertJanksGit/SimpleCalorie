import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";

export default function GoalsTrackingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useUserProfile(user?.uid);

  // Add refs for the TextInputs
  const startWeightInputRef = useRef<TextInput>(null);
  const currentWeightInputRef = useRef<TextInput>(null);
  const goalWeightInputRef = useRef<TextInput>(null);

  const [startDate, setStartDate] = useState(
    profile?.weightGoals?.startDate
      ? new Date(profile.weightGoals.startDate)
      : new Date()
  );
  const [startWeight, setStartWeight] = useState(
    profile?.weightGoals?.startWeight?.toString() || "220"
  );
  const [currentWeight, setCurrentWeight] = useState(
    profile?.weightGoals?.currentWeight?.toString() || "220"
  );
  const [goalWeight, setGoalWeight] = useState(
    profile?.weightGoals?.goalWeight?.toString() || "184"
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Update form when profile changes
  useEffect(() => {
    if (profile?.weightGoals) {
      setStartDate(new Date(profile.weightGoals.startDate));
      setStartWeight(profile.weightGoals.startWeight.toString());
      setCurrentWeight(profile.weightGoals.currentWeight.toString());
      setGoalWeight(profile.weightGoals.goalWeight.toString());
    }
  }, [profile]);

  // Calculate projected date based on calorie budget and weight goals
  const calculateProjectedDate = () => {
    // Simple calculation: assuming 1 pound per week loss
    const weightToLose = Number(currentWeight) - Number(goalWeight);
    const weeksToGoal = weightToLose;
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + weeksToGoal * 7);
    return format(projectedDate, "MMM dd, yyyy");
  };

  const handleSave = async () => {
    try {
      await updateProfile({
        weightGoals: {
          startDate: startDate.toISOString(),
          startWeight: Number(startWeight),
          currentWeight: Number(currentWeight),
          goalWeight: Number(goalWeight),
        },
      });
      router.back();
    } catch (error) {
      console.error("Failed to save goals:", error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setStartDate(selectedDate);
      setShowDatePicker(false);
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Reset Plan",
      "Are you sure you want to reset your weight tracking plan? This will clear your progress and set today as your new start date.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            const today = new Date();
            setStartDate(today);
            setStartWeight(currentWeight);
            try {
              await updateProfile({
                weightGoals: {
                  startDate: today.toISOString(),
                  startWeight: Number(currentWeight),
                  currentWeight: Number(currentWeight),
                  goalWeight: Number(goalWeight),
                },
              });
              Alert.alert("Success", "Your plan has been reset successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to reset plan. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goals & Tracking</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Start Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.label}>Start Date</Text>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {format(startDate, "MMM dd, yyyy")}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => startWeightInputRef.current?.focus()}
          >
            <Text style={styles.label}>Start Weight</Text>
            <View style={styles.valueContainer}>
              <TextInput
                ref={startWeightInputRef}
                style={styles.weightInput}
                value={startWeight}
                onChangeText={setStartWeight}
                keyboardType="numeric"
              />
              <Text style={styles.unit}>lbs</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Current and Goal Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => currentWeightInputRef.current?.focus()}
          >
            <Text style={styles.label}>Current Weight</Text>
            <View style={styles.valueContainer}>
              <TextInput
                ref={currentWeightInputRef}
                style={styles.weightInput}
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
              />
              <Text style={styles.unit}>lbs</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            activeOpacity={0.7}
            onPress={() => goalWeightInputRef.current?.focus()}
          >
            <Text style={styles.label}>Goal Weight</Text>
            <View style={styles.valueContainer}>
              <TextInput
                ref={goalWeightInputRef}
                style={styles.weightInput}
                value={goalWeight}
                onChangeText={setGoalWeight}
                keyboardType="numeric"
              />
              <Text style={styles.unit}>lbs</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Projection Info */}
        <View style={styles.projectionContainer}>
          <Ionicons name="bulb-outline" size={24} color="#333" />
          <Text style={styles.projectionText}>
            Based on your calorie budget and current weight, you are projected
            to reach your goal on {calculateProjectedDate()}.
          </Text>
        </View>

        {/* Reset Button */}
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Start Fresh & Reset Plan</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Start Date</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={startDate}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              style={styles.datePicker}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "white",
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "white",
  },
  label: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  value: {
    fontSize: 16,
    color: "#666",
  },
  weightInput: {
    fontSize: 16,
    color: "#666",
    textAlign: "right",
    width: 50,
    padding: 0,
  },
  unit: {
    fontSize: 16,
    color: "#666",
    marginRight: 8,
  },
  projectionContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    alignItems: "center",
    gap: 12,
  },
  projectionText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  resetButton: {
    margin: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#2196F3",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  datePicker: {
    width: "100%",
    height: 300,
  },
});
