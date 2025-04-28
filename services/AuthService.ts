import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  Auth,
  AuthError,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { UserProfileService } from "./UserProfileService";

// Define error types for better error handling
export interface AuthErrorWithCode extends Error {
  code?: string;
}

// Define user data interface
export interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * AuthService handles all authentication-related functionality
 */
class AuthService {
  private auth: Auth;

  constructor() {
    this.auth = auth;
  }

  /**
   * Register a new user with email and password
   * @param email User's email
   * @param password User's password
   * @returns Promise with UserCredential
   */
  async register(email: string, password: string): Promise<UserCredential> {
    try {
      console.log("Attempting to register with email:", email);
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      console.log("Registration successful:", userCredential.user.uid);

      // Initialize user profile
      const profileService = UserProfileService.getInstance();
      await profileService.initializeUserProfile(userCredential.user.uid, {
        username: email.split("@")[0], // Use part before @ as initial username
        photoURL: "",
      });

      return userCredential;
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      console.error("Registration error:", {
        code: authError.code,
        message: authError.message,
        fullError: error,
      });
      throw this.handleAuthError(authError);
    }
  }

  /**
   * Sign in an existing user with email and password
   * @param email User's email
   * @param password User's password
   * @returns Promise with UserCredential
   */
  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      console.log("Sign in attempt:", {
        email,
        auth: !!this.auth,
        currentUser: this.auth.currentUser?.email,
      });

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      console.log("Sign in result:", {
        success: true,
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        emailVerified: userCredential.user.emailVerified,
        isAnonymous: userCredential.user.isAnonymous,
        metadata: userCredential.user.metadata,
      });

      return userCredential;
    } catch (error) {
      const authError = error as AuthErrorWithCode;
      console.error("Sign in error details:", {
        code: authError.code,
        message: authError.message,
        name: authError.name,
        stack: authError.stack,
        fullError: JSON.stringify(error, null, 2),
      });
      throw this.handleAuthError(authError);
    }
  }

  /**
   * Sign out the current user
   * @returns Promise<void>
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log("Sign out successful");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  }

  /**
   * Get the current authenticated user
   * @returns The current user or null if not authenticated
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Subscribe to authentication state changes
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback);
  }

  /**
   * Convert Firebase user to a simplified user data object
   * @param user Firebase User object
   * @returns Simplified UserData object
   */
  getUserData(user: User | null): UserData | null {
    if (!user) return null;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  /**
   * Handle Firebase authentication errors and convert to user-friendly messages
   * @param error Firebase AuthError
   * @returns Error with user-friendly message
   */
  private handleAuthError(error: AuthErrorWithCode): Error {
    let message = "An authentication error occurred";

    switch (error.code) {
      case "auth/email-already-in-use":
        message = "This email is already registered. Please sign in instead.";
        break;
      case "auth/invalid-email":
        message = "The email address is invalid.";
        break;
      case "auth/operation-not-allowed":
        message =
          "Email/password accounts are not enabled. Please contact support.";
        break;
      case "auth/weak-password":
        message = "The password is too weak. Please use a stronger password.";
        break;
      case "auth/user-disabled":
        message = "This account has been disabled. Please contact support.";
        break;
      case "auth/user-not-found":
        message = "No account found with this email. Please register first.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password. Please try again.";
        break;
      case "auth/invalid-credential":
        message =
          "Invalid email or password. Please check your credentials and try again.";
        break;
      case "auth/too-many-requests":
        message = "Too many failed login attempts. Please try again later.";
        break;
      default:
        message = error.message || "An unknown error occurred";
    }

    console.log("Formatted auth error:", { originalCode: error.code, message });

    const friendlyError = new Error(message);
    (friendlyError as AuthErrorWithCode).code = error.code;
    return friendlyError;
  }
}

// Export a singleton instance
export const authService = new AuthService();
