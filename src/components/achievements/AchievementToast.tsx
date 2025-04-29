import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  useColorScheme,
  AccessibilityInfo,
  ViewStyle,
  TextStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Achievement } from "../../types/achievements";

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
  duration?: number;
}

interface ToastStyles {
  container: ViewStyle;
  containerDark: ViewStyle;
  content: ViewStyle;
  contentDark: ViewStyle;
  textContainer: ViewStyle;
  title: TextStyle;
  achievementName: TextStyle;
  points: TextStyle;
  dismissButton: ViewStyle;
  textDark: TextStyle;
}

export function AchievementToast({
  achievement,
  onDismiss,
  duration = 3000,
}: AchievementToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (!achievement?.id) {
      console.warn("Invalid achievement data provided to AchievementToast");
      onDismiss();
      return;
    }

    // Announce achievement for screen readers
    AccessibilityInfo.announceForAccessibility(
      `Achievement Unlocked! ${achievement.name}. ${achievement.description}`
    );

    // Slide in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss after duration
    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      clearTimeout(timer);
      translateY.setValue(-100);
      opacity.setValue(0);
    };
  }, [achievement]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!achievement?.id) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isDark && styles.containerDark,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.content, isDark && styles.contentDark]}>
        <MaterialCommunityIcons
          name="trophy"
          size={24}
          color="#FFD700"
          accessibilityElementsHidden={true}
        />
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, isDark && styles.textDark]}
            accessibilityRole="header"
          >
            Achievement Unlocked!
          </Text>
          <Text style={[styles.achievementName, isDark && styles.textDark]}>
            {achievement.name}
          </Text>
          {achievement.reward && (
            <Text style={[styles.points, isDark && styles.textDark]}>
              +{achievement.reward.points} points
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.dismissButton}
          accessible={true}
          accessibilityLabel="Dismiss achievement notification"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={isDark ? "#999" : "#666"}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create<ToastStyles>({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 44, // Account for status bar
    zIndex: 1000,
  },
  containerDark: {
    backgroundColor: "transparent",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: width - 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contentDark: {
    backgroundColor: "#1a1a1a",
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 2,
  },
  achievementName: {
    fontSize: 16,
    color: "#333",
  },
  points: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  dismissButton: {
    padding: 4,
  },
  textDark: {
    color: "#fff",
  },
});
