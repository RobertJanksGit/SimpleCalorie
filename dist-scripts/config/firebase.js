"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.storage = exports.db = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const auth_1 = require("firebase/auth");
const expo_constants_1 = __importDefault(require("expo-constants"));
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: expo_constants_1.default.expoConfig?.extra?.FIREBASE_API_KEY,
    authDomain: expo_constants_1.default.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN,
    projectId: expo_constants_1.default.expoConfig?.extra?.FIREBASE_PROJECT_ID,
    storageBucket: expo_constants_1.default.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: expo_constants_1.default.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID,
    appId: expo_constants_1.default.expoConfig?.extra?.FIREBASE_APP_ID,
};
// Initialize Firebase
const app = (0, app_1.initializeApp)(firebaseConfig);
// Initialize Firestore
exports.db = (0, firestore_1.getFirestore)(app);
// Initialize Storage
exports.storage = (0, storage_1.getStorage)(app);
// Initialize Auth
exports.auth = (0, auth_1.getAuth)(app);
exports.default = app;
