import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";
import { router } from "expo-router";
import { useUserProfile } from "../../hooks/useUserProfile";
import { addWeeks, format } from "date-fns";

type BudgetType = "standard" | "custom";
type WeeklyRate = "maintain" | "0.5" | "1.0" | "1.5" | "2.0";

const WEEKLY_RATES = [
  { value: "maintain", label: "Maintain", dailyDeficit: 0 },
  { value: "0.5", label: "Lose 1/2 lb", dailyDeficit: 250 },
  { value: "1.0", label: "Lose 1 lb", dailyDeficit: 500 },
  { value: "1.5", label: "Lose 1 1/2 lb", dailyDeficit: 750 },
  { value: "2.0", label: "Lose 2 lb", dailyDeficit: 1000 },
] as const;

const BASE_CALORIES = 2200; // Base maintenance calories

export default function BudgetScreen() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useUserProfile(user?.uid);
  const [selectedType, setSelectedType] = useState<BudgetType>("standard");
  const [showWeeklyRateModal, setShowWeeklyRateModal] = useState(false);
  const [selectedRate, setSelectedRate] = useState<WeeklyRate>("1.0");

  // Calculate daily calories based on selected rate
  const dailyCalories = useMemo(() => {
    const selectedRateObj = WEEKLY_RATES.find((r) => r.value === selectedRate);
    return BASE_CALORIES - (selectedRateObj?.dailyDeficit || 0);
  }, [selectedRate]);

  // Calculate projected date based on weight goals and selected weekly rate
  const projectedDate = useMemo(() => {
    if (!profile?.weightGoals) return null;

    const { currentWeight, goalWeight } = profile.weightGoals;
    const weightToLose = currentWeight - goalWeight;

    if (selectedRate === "maintain") return null;

    const weeksToGoal = Math.ceil(weightToLose / Number(selectedRate));
    return addWeeks(new Date(), weeksToGoal);
  }, [profile?.weightGoals, selectedRate]);

  const handleRateSelect = async (rate: WeeklyRate) => {
    setSelectedRate(rate);
    setShowWeeklyRateModal(false);

    try {
      await updateProfile({
        weeklyRate: rate,
      });
    } catch (error) {
      console.error("Failed to update weekly rate:", error);
    }
  };

  const WeeklyRateModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showWeeklyRateModal}
      onRequestClose={() => setShowWeeklyRateModal(false)}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={() => setShowWeeklyRateModal(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Weekly Rate</Text>
            <TouchableOpacity
              onPress={() => setShowWeeklyRateModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {WEEKLY_RATES.map((rate) => (
            <TouchableOpacity
              key={rate.value}
              style={[
                styles.rateOption,
                selectedRate === rate.value && styles.selectedRateOption,
              ]}
              onPress={() => handleRateSelect(rate.value)}
            >
              <Text
                style={[
                  styles.rateOptionText,
                  selectedRate === rate.value && styles.selectedRateOptionText,
                ]}
              >
                {rate.label}
              </Text>
              {selectedRate === rate.value && (
                <Ionicons name="checkmark" size={24} color="#0096FF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
            <Text style={styles.backText}>Profile</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WeeklyRateModal />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#333" />
          <Text style={styles.backText}>Profile</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView}>
        {/* Budget Type Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUDGET TYPE</Text>
          <View style={styles.cardContainer}>
            <TouchableOpacity
              style={[
                styles.card,
                selectedType === "standard" && styles.selectedCard,
              ]}
              onPress={() => setSelectedType("standard")}
            >
              <Text
                style={[
                  styles.cardTitle,
                  selectedType === "standard" && styles.selectedCardTitle,
                ]}
              >
                Standard
              </Text>
              <Text style={styles.cardSubtitle}>Calculated by Lose It!</Text>
              <View style={styles.iconContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={selectedType === "standard" ? "#0096FF" : "#666"}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.card,
                selectedType === "custom" && styles.selectedCard,
              ]}
              onPress={() => setSelectedType("custom")}
            >
              <Text
                style={[
                  styles.cardTitle,
                  selectedType === "custom" && styles.selectedCardTitle,
                ]}
              >
                Custom
              </Text>
              <Text style={styles.cardSubtitle}>Set by you</Text>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={24} color="#666" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BUDGET DETAILS</Text>
          <View style={styles.detailsCard}>
            <Text style={styles.calorieNumber}>
              {dailyCalories.toLocaleString()}
            </Text>
            <Text style={styles.calorieText}>average daily calories</Text>

            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => setShowWeeklyRateModal(true)}
            >
              <Text style={styles.detailLabel}>Weekly Rate</Text>
              <View style={styles.detailValue}>
                <Text style={styles.detailValueText}>
                  {WEEKLY_RATES.find((r) => r.value === selectedRate)?.label}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Projection Card */}
          <View style={styles.projectionCard}>
            <View style={styles.projectionContent}>
              <Ionicons name="bulb-outline" size={24} color="#333" />
              <Text style={styles.projectionText}>
                {selectedRate === "maintain" ? (
                  "You have chosen to maintain your current weight."
                ) : (
                  <>
                    Based on your calorie budget and current weight, you are
                    projected to reach your goal on{" "}
                    <Text style={styles.projectionDate}>
                      {projectedDate
                        ? format(projectedDate, "MMM dd, yyyy")
                        : "calculating..."}
                    </Text>
                    .
                  </>
                )}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 15,
    fontWeight: "500",
  },
  cardContainer: {
    flexDirection: "row",
    gap: 15,
  },
  card: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    minHeight: 120,
    justifyContent: "space-between",
  },
  selectedCard: {
    borderColor: "#0096FF",
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  selectedCardTitle: {
    color: "#0096FF",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  detailsCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
  },
  calorieNumber: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  calorieText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  detailLabel: {
    fontSize: 16,
    color: "#333",
  },
  detailValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailValueText: {
    fontSize: 16,
    color: "#666",
  },
  projectionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    marginTop: 15,
  },
  projectionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  projectionText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
  },
  projectionDate: {
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  backText: {
    fontSize: 16,
    color: "#333",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  rateOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  selectedRateOption: {
    backgroundColor: "#f0f9ff",
  },
  rateOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedRateOptionText: {
    color: "#0096FF",
    fontWeight: "500",
  },
});
