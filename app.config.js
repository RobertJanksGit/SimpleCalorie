import "dotenv/config";

export default {
  expo: {
    name: "cal-tracker",
    slug: "cal-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      bundleIdentifier: "com.robjank.myapp",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription:
          "This app uses the camera to capture food photos for calorie tracking.",
        NSPhotoLibraryUsageDescription:
          "This app needs access to your photo library to upload food photos for calorie tracking.",
      },
    },
    android: {
      bundleIdentifier: "com.robjank.myapp",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      permissions: ["CAMERA", "READ_EXTERNAL_STORAGE"],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow $(PRODUCT_NAME) to access your camera to capture food photos.",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    // Add environment variables to expo-constants
    extra: {
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_CLIENT_ID: process.env.FIREBASE_CLIENT_ID,
    },
  },
};
