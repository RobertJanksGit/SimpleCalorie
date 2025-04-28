import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { PhotoService } from "../../services/PhotoService";
import { useAuth } from "../../contexts/AuthContext";
import ChatUI from "../../components/ChatUI";
import { useDailyTotals } from "../../hooks/useDailyTotals";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  limit,
} from "firebase/firestore";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import { getLocalDate } from "../../utils/dateUtils";

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
  id: string;
  photoUrl?: string;
  confidence?: number;
  analysisNotes?: string;
  status: string;
}

interface EditModalProps {
  visible: boolean;
  meal: Meal | null;
  onClose: () => void;
  onSave: (mealId: string, calories: number) => void;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { photoTaken: photoTakenParam, openChat: openChatParam } =
    useLocalSearchParams<{
      photoTaken: string;
      openChat: string;
    }>();
  const [photoTaken, setPhotoTaken] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const { totals, goals, loading, getRemainingCalories, getMacroPercentages } =
    useDailyTotals(user?.uid || "testUser");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const swipeableRefs = useRef<{ [key: string]: Swipeable | null }>({});
  const gestureStateRef = useRef<{ isGesture: boolean }>({ isGesture: false });
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [imageLoadingStates, setImageLoadingStates] = useState<{
    [key: string]: boolean;
  }>({});
  const [alertShown, setAlertShown] = useState(false);

  // Fetch meals for today
  useEffect(() => {
    if (!user?.uid) return;

    const date = getLocalDate();
    const mealsPath = `users/${user.uid}/logs/${date}/meals`;
    const mealsRef = collection(db, mealsPath);
    const q = query(mealsRef, orderBy("timestamp", "desc"));

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Add debug logging for all snapshot events
        console.log("Firestore snapshot received with changes:", {
          docChanges: snapshot.docChanges().length,
          totalDocs: snapshot.docs.length,
        });

        // Process document changes first to detect errors before rendering
        snapshot.docChanges().forEach((change) => {
          console.log("Document change event:", {
            type: change.type,
            id: change.doc.id,
            data: change.doc.data(),
          });

          // Instead of checking for removed documents, check for failed status
          if (change.type === "modified" || change.type === "added") {
            const data = change.doc.data();
            // Check if this is a meal that was marked as failed with "No food detected"
            if (
              data &&
              data.status === "failed" &&
              data.errorMessage &&
              data.errorMessage.includes("No food detected")
            ) {
              console.log("No food detected error:", {
                id: change.doc.id,
                errorMessage: data.errorMessage,
              });

              // Only show the notification if we haven't shown one recently
              if (!alertShown) {
                console.log("Showing No Food Detected notification");
                Alert.alert(
                  "No Food Detected",
                  "We couldn't detect any food in the image. Please try taking a clearer photo of your meal."
                );
                setAlertShown(true);

                // Reset the alert flag after a delay
                setTimeout(() => {
                  setAlertShown(false);
                }, 5000);
              }
            }
          }
        });

        const fetchedMeals = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            // Skip failed meals and show appropriate error
            if (data.status === "failed") {
              const errorMsg = data.errorMessage || "Unknown error";

              // Only show alert if we haven't shown one recently
              // and if it's not a "No food detected" error (which we handled above)
              if (!alertShown && !errorMsg.includes("No food detected")) {
                Alert.alert(
                  "Analysis Failed",
                  "Failed to analyze the meal. Please try again."
                );
                setAlertShown(true);

                // Reset the alert flag after a delay
                setTimeout(() => {
                  setAlertShown(false);
                }, 5000);
              }
              return null;
            }
            return {
              id: doc.id,
              type: data.mealType || "Meal",
              name: data.foodName || "Meal",
              time: new Date(data.timestamp).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              }),
              calories: data.calories || 0,
              protein: data.protein || 0,
              carbs: data.carbs || 0,
              fat: data.fat || 0,
              photoUrl: data.photoUrl || null,
              confidence: data.confidence || undefined,
              analysisNotes: data.analysisNotes || undefined,
              status: data.status || "completed",
            } as Meal;
          })
          .filter((meal): meal is Meal => meal !== null)
          // Sort meals: pending first, then by timestamp
          .sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1;
            if (a.status !== "pending" && b.status === "pending") return 1;
            return new Date(b.time).getTime() - new Date(a.time).getTime();
          });
        setMeals(fetchedMeals);
      },
      (error) => {
        console.error("Error fetching meals:", error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, alertShown]);

  // Remove the separate analyzing state effect since we're handling it in the meals listener
  useEffect(() => {
    if (photoTakenParam === "true") {
      setPhotoTaken(true);
    }

    if (openChatParam === "true") {
      setIsChatVisible(true);
    }
  }, [photoTakenParam, openChatParam]);

  const handleDeleteMeal = async (mealId: string) => {
    if (!user?.uid) return;

    try {
      const date = getLocalDate();
      const mealRef = doc(db, `users/${user.uid}/logs/${date}/meals`, mealId);
      const dailyTotalsRef = doc(db, `users/${user.uid}/dailyTotals/${date}`);

      // Delete the meal
      await deleteDoc(mealRef);

      // Update local state
      setMeals((prevMeals) => prevMeals.filter((meal) => meal.id !== mealId));

      // Recalculate daily totals from remaining meals
      const mealsRef = collection(db, `users/${user.uid}/logs/${date}/meals`);
      const mealsSnapshot = await getDocs(mealsRef);

      let newTotals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        meals: mealsSnapshot.size,
        lastUpdated: new Date().toISOString(),
      };

      // Sum up all remaining meals
      mealsSnapshot.forEach((doc) => {
        const mealData = doc.data();
        if (mealData.status !== "failed") {
          newTotals.calories += mealData.calories || 0;
          newTotals.protein += mealData.protein || 0;
          newTotals.carbs += mealData.carbs || 0;
          newTotals.fat += mealData.fat || 0;
          newTotals.fiber += mealData.fiber || 0;
          newTotals.sugar += mealData.sugar || 0;
        }
      });

      // Update daily totals
      await updateDoc(dailyTotalsRef, newTotals);

      // Close any open swipeable
      if (swipeableRefs.current[mealId]) {
        swipeableRefs.current[mealId]?.close();
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      alert("Failed to delete meal. Please try again.");
    }
  };

  const handleEditMeal = async (mealId: string, newCalories: number) => {
    if (!user?.uid) return;

    // Close modal first to prevent UI freeze
    setEditModalVisible(false);
    setEditingMeal(null);

    try {
      const date = getLocalDate();
      const mealRef = doc(db, `users/${user.uid}/logs/${date}/meals`, mealId);
      const dailyTotalsRef = doc(db, `users/${user.uid}/dailyTotals/${date}`);

      // Update local state optimistically
      setMeals((prevMeals) =>
        prevMeals.map((meal) =>
          meal.id === mealId ? { ...meal, calories: newCalories } : meal
        )
      );

      // Update the meal in Firestore
      await updateDoc(mealRef, {
        calories: newCalories,
        updatedAt: new Date().toISOString(),
      });

      // Recalculate daily totals
      const mealsRef = collection(db, `users/${user.uid}/logs/${date}/meals`);
      const mealsSnapshot = await getDocs(mealsRef);

      let totalCalories = 0;
      mealsSnapshot.forEach((doc) => {
        const mealData = doc.data();
        totalCalories += mealData.calories || 0;
      });

      // Update daily totals
      await updateDoc(dailyTotalsRef, {
        calories: totalCalories,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error updating meal:", error);
      // Revert local state on error
      const originalMeal = meals.find((m) => m.id === mealId);
      if (originalMeal) {
        setMeals((prevMeals) =>
          prevMeals.map((meal) =>
            meal.id === mealId
              ? { ...meal, calories: originalMeal.calories }
              : meal
          )
        );
      }
      alert("Failed to update meal. Please try again.");
    }
  };

  const handleOpenChat = () => {
    console.log("Opening chat...");
    setIsChatVisible(true);
  };

  const handleCloseChat = () => {
    console.log("Closing chat...");
    setIsChatVisible(false);
  };

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

        // Set photoTaken to true and show chat
        setPhotoTaken(true);
        setIsChatVisible(true);

        // Navigate back after successful upload
        router.back();
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    }
  };

  const MacroProgress = ({
    label,
    current,
    goal,
    color,
  }: MacroProgressProps) => {
    const percentage = Math.round((current / goal) * 100);
    const isExceeding = percentage > 100;

    return (
      <View style={styles.macroProgress}>
        <View style={styles.macroLabelContainer}>
          <Text style={styles.macroLabel}>{label}</Text>
          {isExceeding && (
            <Text style={styles.exceedingIndicator}>Exceeding</Text>
          )}
        </View>
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: isExceeding ? "100%" : `${percentage}%`,
                backgroundColor: isExceeding ? "#FF6B6B" : color,
                opacity: percentage === 0 ? 0.3 : 1,
              },
            ]}
          />
        </View>
        <View style={styles.macroValuesContainer}>
          <Text
            style={[styles.macroValues, isExceeding && styles.exceedingValue]}
          >
            {current}g / {goal}g
          </Text>
          {isExceeding && (
            <Text style={styles.exceedingAmount}>(+{current - goal}g)</Text>
          )}
        </View>
      </View>
    );
  };

  // Calculate calories consumed and percentage
  const caloriesConsumed = totals?.calories || 0;
  const remainingCalories = goals.calories - caloriesConsumed;
  const percentageComplete = Math.round(
    (caloriesConsumed / goals.calories) * 100
  );

  // Add a useEffect to log the totals for debugging
  useEffect(() => {
    console.log("Daily Totals:", totals);
  }, [totals]);

  const EditModal = ({ visible, meal, onClose, onSave }: EditModalProps) => {
    const [calories, setCalories] = useState(meal?.calories.toString() || "0");

    useEffect(() => {
      if (meal) {
        setCalories(meal.calories.toString());
      }
    }, [meal]);

    const handleSave = () => {
      const newCalories = parseInt(calories) || 0;
      if (meal) {
        onSave(meal.id, newCalories);
      }
    };

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Calories</Text>
            <Text style={styles.modalMealName}>{meal?.name}</Text>

            <TextInput
              style={styles.calorieInput}
              keyboardType="numeric"
              value={calories}
              onChangeText={setCalories}
              placeholder="Enter calories"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={[styles.modalButtonText, styles.saveButtonText]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderMealCard = (meal: Meal) => {
    const isExpanded = expandedMealId === meal.id;
    const isPending = meal.status === "pending";

    const handleCardPress = () => {
      if (!gestureStateRef.current.isGesture && !isPending) {
        setExpandedMealId(isExpanded ? null : meal.id);
      }
    };

    const handleImageLoadStart = (mealId: string) => {
      setImageLoadingStates((prev) => ({ ...prev, [mealId]: true }));
    };

    const handleImageLoadEnd = (mealId: string) => {
      setImageLoadingStates((prev) => ({ ...prev, [mealId]: false }));
    };

    const renderRightActions = (
      progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>
    ) => {
      const trans = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [64, 0],
      });

      return isPending ? null : (
        <View style={styles.rightActions}>
          <Animated.View style={{ transform: [{ translateX: trans }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => {
                setEditingMeal(meal);
                setEditModalVisible(true);
              }}
            >
              <Ionicons name="pencil" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
          <Animated.View style={{ transform: [{ translateX: trans }] }}>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteMeal(meal.id)}
            >
              <Ionicons name="trash" size={20} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      );
    };

    return (
      <Swipeable
        key={meal.id}
        ref={(ref) => (swipeableRefs.current[meal.id] = ref)}
        renderRightActions={renderRightActions}
        rightThreshold={40}
        onSwipeableWillOpen={() => {
          gestureStateRef.current.isGesture = true;
        }}
        onSwipeableOpen={() => {
          setSelectedMealId(meal.id);
        }}
        onSwipeableClose={() => {
          setSelectedMealId(null);
          setTimeout(() => {
            gestureStateRef.current.isGesture = false;
          }, 100);
        }}
        overshootRight={false}
        enabled={!isPending}
      >
        <TouchableOpacity
          style={[styles.mealCard, isPending && styles.analyzingCard]}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          <View style={styles.mealContent}>
            {meal.photoUrl && (
              <View style={styles.mealImageContainer}>
                <Image
                  source={{ uri: meal.photoUrl }}
                  style={styles.mealImage}
                  resizeMode="cover"
                  onLoadStart={() => handleImageLoadStart(meal.id)}
                  onLoadEnd={() => handleImageLoadEnd(meal.id)}
                />
                {imageLoadingStates[meal.id] && (
                  <View style={styles.imageLoadingContainer}>
                    <ActivityIndicator size="small" color="#4CAF50" />
                  </View>
                )}
              </View>
            )}
            <View style={styles.mealInfo}>
              <View style={styles.mealHeader}>
                <Text style={styles.mealType}>
                  {isPending ? "Analyzing..." : meal.type}
                </Text>
                {!isPending && meal.confidence !== undefined && (
                  <View
                    style={[
                      styles.confidenceTag,
                      { backgroundColor: getConfidenceColor(meal.confidence) },
                    ]}
                  >
                    <Text style={styles.confidenceText}>
                      {getConfidenceLabel(meal.confidence)} Confidence
                    </Text>
                  </View>
                )}
              </View>
              {isPending ? (
                <View style={styles.analyzingContent}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.analyzingText}>
                    AI is analyzing your meal...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.mealName}>{meal.name}</Text>
                  <Text style={styles.macroText}>
                    Protein: {meal.protein}g • Carbs: {meal.carbs}g • Fat:{" "}
                    {meal.fat}g
                  </Text>
                </>
              )}
            </View>
            {!isPending && (
              <View style={styles.mealRight}>
                <Text style={styles.mealTime}>{meal.time}</Text>
                <Text style={styles.mealCalories}>{meal.calories} cal</Text>
              </View>
            )}
          </View>
          {isExpanded && meal.analysisNotes && !isPending && (
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisNotes}>{meal.analysisNotes}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Function to get confidence indicator color
  const getConfidenceColor = (confidence: number = 0) => {
    if (confidence >= 0.8) return "#22c55e"; // Green for high confidence
    if (confidence >= 0.6) return "#eab308"; // Yellow for medium confidence
    return "#ef4444"; // Red for low confidence
  };

  // Function to get confidence label
  const getConfidenceLabel = (confidence: number = 0) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView style={styles.scrollView}>
          {/* Daily Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={styles.summaryLabel}>Today's Calories</Text>
                <View style={styles.caloriesContainer}>
                  <Text style={styles.caloriesConsumed}>
                    {loading ? "..." : caloriesConsumed}
                  </Text>
                  <Text style={styles.caloriesGoal}>/ {goals.calories}</Text>
                </View>
                <Text style={styles.remainingText}>
                  {loading
                    ? "Loading..."
                    : remainingCalories > 0
                    ? `${remainingCalories} calories remaining`
                    : remainingCalories === 0
                    ? "Goal reached!"
                    : `${Math.abs(remainingCalories)} calories over goal`}
                </Text>
              </View>
              <View
                style={[
                  styles.percentageContainer,
                  {
                    backgroundColor:
                      remainingCalories >= 0 ? "#4CAF50" : "#FF6B6B",
                    opacity: loading ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={styles.percentageText}>
                  {loading ? "..." : `${percentageComplete}%`}
                </Text>
              </View>
            </View>

            {/* Macros */}
            <View style={styles.macrosContainer}>
              <MacroProgress
                label="Protein"
                current={totals?.protein || 0}
                goal={goals.protein}
                color="#FF6B6B"
              />
              <MacroProgress
                label="Carbs"
                current={totals?.carbs || 0}
                goal={goals.carbs}
                color="#4ECDC4"
              />
              <MacroProgress
                label="Fat"
                current={totals?.fat || 0}
                goal={goals.fat}
                color="#FFD93D"
              />
            </View>
          </View>

          {/* Add Meal Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleUploadMeal}
            >
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
          {meals.map((meal) => (
            <View key={meal.id} style={styles.mealCardContainer}>
              {renderMealCard(meal)}
            </View>
          ))}
          {meals.length === 0 && (
            <Text style={styles.noMealsText}>No meals logged today</Text>
          )}
        </ScrollView>

        {/* Bottom Tab Bar */}
        <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.tabItem}>
            <Ionicons name="home" size={24} color="#4CAF50" />
            <Text style={[styles.tabText, { color: "#4CAF50" }]}>Home</Text>
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
            onPress={handleOpenChat}
          >
            <View style={styles.chatButton}>
              <Ionicons name="chatbubble" size={24} color="white" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/insights")}
          >
            <Ionicons name="stats-chart" size={24} color="#666" />
            <Text style={styles.tabText}>Insights</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="person-outline" size={24} color="#666" />
            <Text style={styles.tabText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <EditModal
          visible={editModalVisible}
          meal={editingMeal}
          onClose={() => {
            setEditModalVisible(false);
            setEditingMeal(null);
          }}
          onSave={handleEditMeal}
        />

        <ChatUI
          isVisible={isChatVisible}
          onClose={handleCloseChat}
          userId={user?.uid || "testUser"}
          showPhotoConfirmation={photoTaken}
        />
      </View>
    </GestureHandlerRootView>
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
  caloriesConsumed: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  caloriesGoal: {
    fontSize: 16,
    color: "#666",
    marginLeft: 4,
  },
  remainingText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  percentageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  macroLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 14,
    color: "#666",
  },
  exceedingIndicator: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
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
  macroValuesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroValues: {
    fontSize: 12,
    color: "#666",
  },
  exceedingValue: {
    color: "#FF6B6B",
  },
  exceedingAmount: {
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
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
  mealCardContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  mealCard: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  mealContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  mealImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    overflow: "hidden",
    position: "relative",
  },
  mealImage: {
    width: "100%",
    height: "100%",
  },
  imageLoadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  mealInfo: {
    flex: 1,
    marginRight: 12,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
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
    marginTop: 4,
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
  noMealsText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    marginTop: 20,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  actionButton: {
    width: 48,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: "#4ECDC4",
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  modalMealName: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  calorieInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  saveButtonText: {
    color: "white",
  },
  confidenceTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  confidenceText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  analysisContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  analysisNotes: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  analyzingCard: {
    backgroundColor: "#f8f9fa",
    opacity: 0.9,
  },
  analyzingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  analyzingText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
});
