import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Get environment variables from expo-constants
const extra = Constants.expoConfig?.extra || {};

// Log environment variables (excluding sensitive data)
console.log("Firebase Config Status:", {
  hasApiKey: !!extra.FIREBASE_API_KEY,
  hasAuthDomain: !!extra.FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!extra.FIREBASE_PROJECT_ID,
  hasStorageBucket: !!extra.FIREBASE_STORAGE_BUCKET,
  hasMessagingSenderId: !!extra.FIREBASE_MESSAGING_SENDER_ID,
  hasAppId: !!extra.FIREBASE_APP_ID,
  hasClientId: !!extra.FIREBASE_CLIENT_ID,
});

// Firebase configuration
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID,
  clientId: Constants.expoConfig?.extra?.FIREBASE_CLIENT_ID,
};

// Initialize Firebase
console.log("Initializing Firebase app...");
const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized successfully");

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
