import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import * as ImagePicker from "expo-image-picker";
import { storage } from "../../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useUserProfile(user?.uid);

  const [username, setUsername] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setPhotoURL(profile.photoURL);
    }
  }, [profile]);

  const handleSelectImage = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to change your profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const uploadProfileImage = async (uri: string) => {
    if (!user?.uid) return;

    try {
      setIsUploading(true);

      // Convert URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to Firebase Storage
      const storageRef = ref(storage, `profile-images/${user.uid}`);
      await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      setPhotoURL(downloadURL);
    } catch (error) {
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    try {
      await updateProfile({
        username: username.trim(),
        photoURL,
      });

      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Image */}
      <View style={styles.imageContainer}>
        <TouchableOpacity
          onPress={handleSelectImage}
          style={styles.imageWrapper}
        >
          {isUploading ? (
            <View style={[styles.profileImage, styles.centered]}>
              <ActivityIndicator color="#4CAF50" />
            </View>
          ) : (
            <>
              <Image
                source={{ uri: photoURL || "https://via.placeholder.com/150" }}
                style={styles.profileImage}
              />
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
          autoCapitalize="none"
          maxLength={30}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
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
  imageContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  imageWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f0f0f0",
  },
  editIconContainer: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: "#4CAF50",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  form: {
    padding: 16,
    backgroundColor: "white",
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
  },
});
