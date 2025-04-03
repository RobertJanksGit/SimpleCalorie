import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { AuthErrorWithCode } from "../services/AuthService";

/**
 * Example component demonstrating how to use the AuthContext
 */
export default function AuthContextExample() {
  const { user, isLoading, isAuthenticated, register, signIn, signOut } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle user registration
  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password);
      Alert.alert("Success", "Account created successfully!");
      setEmail("");
      setPassword("");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      Alert.alert("Registration Error", authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user sign in
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
      Alert.alert("Success", "Signed in successfully!");
      setEmail("");
      setPassword("");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      Alert.alert("Sign In Error", authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user sign out
  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await signOut();
      Alert.alert("Success", "Signed out successfully!");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      Alert.alert("Sign Out Error", authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading indicator while checking authentication state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading authentication state...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication with Context</Text>

      {isAuthenticated && user ? (
        <View style={styles.userContainer}>
          <Text style={styles.welcomeText}>Welcome, {user.email}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignOut}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>
              {isSubmitting ? "Signing Out..." : "Sign Out"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.signInButton]}
              onPress={handleSignIn}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={handleRegister}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? "Registering..." : "Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    margin: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  input: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  signInButton: {
    backgroundColor: "#4285F4",
  },
  registerButton: {
    backgroundColor: "#34A853",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  userContainer: {
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
  },
});
