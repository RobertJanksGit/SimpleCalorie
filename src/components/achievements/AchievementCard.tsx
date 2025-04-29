import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, AccessibilityInfo } from "react-native";
import { Achievement, UserAchievementProgress } from "../../types/achievements";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";

interface AchievementCardProps {
  achievement: Achievement;
  progress?: UserAchievementProgress;
  isLocked?: boolean;
}

function AchievementCardComponent({
  achievement,
  progress,
  isLocked = false,
}: AchievementCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const getBadgeIcon = useMemo(() => {
    if (!achievement?.type) return "medal";

    switch (achievement.type) {
      case "streak":
        return "fire";
      case "cumulative":
        return "counter";
      case "social":
        return "account-group";
      default:
        return "medal";
    }
  }, [achievement?.type]);

  const getProgressText = useMemo(() => {
    if (!progress || isLocked || !achievement?.criteria?.count) return "";
    const count = achievement.criteria.count;

    switch (achievement.type) {
      case "streak":
        return `${progress.currentStreak || 0}/${count} days`;
      case "cumulative":
        return `${progress.currentCount || 0}/${count}`;
      case "social":
        return progress.currentCount
          ? `${progress.currentCount}/${count} friends`
          : "Not started";
      default:
        return "";
    }
  }, [progress, isLocked, achievement?.type, achievement?.criteria?.count]);

  const progressPercentage = useMemo(() => {
    if (!progress || isLocked || !achievement?.criteria?.count) return 0;
    const target = achievement.criteria.count;

    if (!target || target <= 0) return 0;

    let current = 0;
    switch (achievement.type) {
      case "streak":
        current = progress.currentStreak || 0;
        break;
      case "cumulative":
      case "social":
        current = progress.currentCount || 0;
        break;
      default:
        return 0;
    }

    return Math.min((current / target) * 100, 100);
  }, [progress, isLocked, achievement?.type, achievement?.criteria?.count]);

  const displayName = isLocked && achievement.hidden ? "???" : achievement.name;
  const displayDescription =
    isLocked && achievement.hidden
      ? "Secret Achievement"
      : achievement.description || "No description available";

  const accessibilityLabel = `${displayName}. ${displayDescription}. ${
    isLocked ? "Locked achievement" : "Unlocked achievement"
  }. ${getProgressText}`;

  return (
    <View
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
        isLocked && styles.locked,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={isLocked ? ["#666", "#444"] : ["#4CAF50", "#2196F3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <MaterialCommunityIcons
          name={getBadgeIcon}
          size={24}
          color={isLocked ? "#999" : "#fff"}
          accessibilityElementsHidden={true}
        />
      </LinearGradient>

      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            isDark ? styles.textDark : styles.textLight,
            isLocked && styles.lockedText,
          ]}
        >
          {displayName}
        </Text>

        <Text
          style={[
            styles.description,
            isDark ? styles.textDark : styles.textLight,
            isLocked && styles.lockedText,
          ]}
        >
          {displayDescription}
        </Text>

        {!isLocked && achievement.reward && (
          <Text
            style={[styles.reward, isDark ? styles.textDark : styles.textLight]}
          >
            🏆 {achievement.reward.points} points
          </Text>
        )}

        {(achievement.type === "streak" ||
          achievement.type === "cumulative" ||
          achievement.type === "social") && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                isDark ? styles.textDark : styles.textLight,
              ]}
            >
              {getProgressText}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export const AchievementCard = memo(AchievementCardComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  containerLight: {
    backgroundColor: "#fff",
  },
  containerDark: {
    backgroundColor: "#1a1a1a",
  },
  locked: {
    opacity: 0.7,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  reward: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  textLight: {
    color: "#000",
  },
  textDark: {
    color: "#fff",
  },
  lockedText: {
    opacity: 0.5,
  },
});
