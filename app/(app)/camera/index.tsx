import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PhotoService } from "../../../services/PhotoService";
import { useAuth } from "../../../contexts/AuthContext";

// Define meal types
const MEAL_TYPES = [
  { id: "breakfast", label: "BREAKFAST" },
  { id: "lunch", label: "LUNCH" },
  { id: "dinner", label: "DINNER" },
  { id: "snacks", label: "SNACKS" },
];

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showMealSelector, setShowMealSelector] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { user } = useAuth();
  const { mealType: initialMealType } = useLocalSearchParams<{
    mealType: string;
  }>();
  const [selectedMealType, setSelectedMealType] = useState(
    initialMealType || "breakfast"
  );

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity onPress={requestPermission}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || !isCameraReady || !user) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo) {
        throw new Error("Failed to capture photo");
      }

      setIsUploading(true);

      try {
        // Upload the photo using PhotoService
        const photoService = PhotoService.getInstance();
        await photoService.retryUpload(photo.uri, user.uid, selectedMealType);

        // Navigate back and show analysis in chat
        router.push({
          pathname: "/",
          params: { photoTaken: "true", showChat: "true" },
        });
      } catch (error) {
        console.error("Error uploading photo:", error);
        Alert.alert(
          "Upload Error",
          "Failed to upload photo. Please try again."
        );
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  };

  const handleMealSelect = (mealId: string) => {
    setSelectedMealType(mealId);
    setShowMealSelector(false);
  };

  const renderMealSelector = () => (
    <Modal
      visible={showMealSelector}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowMealSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Meal Type</Text>
            <TouchableOpacity onPress={() => setShowMealSelector(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={MEAL_TYPES}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.mealOption,
                  selectedMealType === item.id && styles.selectedMealOption,
                ]}
                onPress={() => handleMealSelect(item.id)}
              >
                <Text
                  style={[
                    styles.mealOptionText,
                    selectedMealType === item.id &&
                      styles.selectedMealOptionText,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedMealType === item.id && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.mealSelector}
          onPress={() => setShowMealSelector(true)}
        >
          <Text style={styles.headerText}>
            {selectedMealType?.toUpperCase() || "SELECT MEAL"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onCameraReady={() => setIsCameraReady(true)}
      >
        <View style={styles.buttonContainer}>
          {isUploading ? (
            <ActivityIndicator size="large" color="white" />
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={!isCameraReady}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>

      {renderMealSelector()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mealSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginRight: 5,
  },
  camera: {
    flex: 1,
    justifyContent: "flex-end",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  text: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  closeButton: {
    padding: 5,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "50%",
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
  },
  mealOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedMealOption: {
    backgroundColor: "#f0f8ff",
  },
  mealOptionText: {
    fontSize: 16,
    color: "#333",
  },
  selectedMealOptionText: {
    color: "#007AFF",
    fontWeight: "500",
  },
});
