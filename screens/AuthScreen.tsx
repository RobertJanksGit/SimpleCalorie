import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../contexts/AuthContext";
import { AuthErrorWithCode } from "../services/AuthService";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Import Expo components
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // TODO: Implement Google Sign In
      // For now, we'll just show an alert
      alert("Google Sign In to be implemented");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      alert(authError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={require("../assets/images/signinpage.jpg")}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <Text style={styles.title}>Sign in and synchronize your data</Text>
            <Text style={styles.subtitle}>
              So your data won't be lost when your device changed.
            </Text>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <BlurView intensity={10} style={styles.buttonBlur}>
                <Ionicons
                  name="logo-google"
                  size={24}
                  color="#FFFFFF"
                  style={styles.googleIcon}
                />
                <Text style={styles.googleButtonText}>
                  {isLoading ? "Signing in..." : "Sign in with Google"}
                </Text>
              </BlurView>
            </TouchableOpacity>

            {/* Other Options */}
            <View style={styles.otherOptionsContainer}>
              <View style={styles.divider} />
              <Text style={styles.otherOptionsText}>Others</Text>
              <View style={styles.divider} />
            </View>

            {/* Email Sign In/Sign Up Links */}
            <View style={styles.emailOptionsContainer}>
              <Link href="/auth/email-signin" asChild>
                <TouchableOpacity
                  style={styles.emailButton}
                  onPress={() =>
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }
                >
                  <Text style={styles.emailButtonText}>Sign in with Email</Text>
                </TouchableOpacity>
              </Link>

              <Link href="/auth/email-signup" asChild>
                <TouchableOpacity
                  style={[styles.emailButton, styles.signUpButton]}
                  onPress={() =>
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }
                ></TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFDFD",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 40,
  },
  heroContainer: {
    width: "100%",
    height: 300,
    marginTop: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  content: {
    width: "100%",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    color: "#000000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    marginBottom: 32,
  },
  googleButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 24,
  },
  buttonBlur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    height: "100%",
    width: "100%",
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  otherOptionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  otherOptionsText: {
    marginHorizontal: 16,
    color: "#666666",
    fontSize: 14,
  },
  emailOptionsContainer: {
    width: "100%",
    gap: 12,
  },
  emailButton: {
    width: "100%",
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  signUpButton: {
    backgroundColor: "#F5F5F5",
  },
  signUpText: {
    color: "#666666",
  },
});
