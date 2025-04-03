import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import {
  authService,
  UserData,
  AuthErrorWithCode,
} from "../services/AuthService";

/**
 * Example component demonstrating how to use the AuthService
 */
export default function AuthExample() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser(authService.getUserData(firebaseUser));
      } else {
        setUser(null);
      }
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []);

  // Handle user registration
  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      await authService.register(email, password);
      Alert.alert("Success", "Account created successfully!");
      setEmail("");
      setPassword("");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      Alert.alert("Registration Error", authError.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user sign in
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      await authService.signIn(email, password);
      Alert.alert("Success", "Signed in successfully!");
      setEmail("");
      setPassword("");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      Alert.alert("Sign In Error", authError.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user sign out
  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authService.signOut();
      Alert.alert("Success", "Signed out successfully!");
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      Alert.alert("Sign Out Error", authError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Example</Text>

      {user ? (
        <View style={styles.userContainer}>
          <Text style={styles.welcomeText}>Welcome, {user.email}</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignOut}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Signing Out..." : "Sign Out"}
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
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Signing In..." : "Sign In"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Registering..." : "Register"}
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
