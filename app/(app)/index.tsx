import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.welcomeContainer}>
          <Ionicons name="person-circle-outline" size={64} color="#4285F4" />
          <Text style={styles.welcomeText}>
            Welcome, {user?.email || "User"}!
          </Text>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  welcomeContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
    marginTop: 16,
    textAlign: "center",
  },
  signOutButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
  },
});
