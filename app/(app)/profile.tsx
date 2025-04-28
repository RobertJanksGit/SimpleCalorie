import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";
import { useUserProfile } from "../../hooks/useUserProfile";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile, loading, error, updateSubscriptionTier } = useUserProfile(
    user?.uid
  );

  const handleUpgrade = async () => {
    try {
      await updateSubscriptionTier("premium");
      Alert.alert(
        "Success",
        "You've been upgraded to Premium! Thank you for your support."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to upgrade to premium. Please try again later."
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>
          Error loading profile. Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: profile?.photoURL || "https://via.placeholder.com/100",
              }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.username}>{profile?.username || "User"}</Text>
          <Text style={styles.membershipStatus}>
            {profile?.subscriptionTier === "premium"
              ? "Premium Member"
              : "Free Member"}
          </Text>
          <View style={styles.streakContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
            <Text style={styles.streakText}>
              {profile?.streak.current || 0} day streak
            </Text>
            <TouchableOpacity>
              <Ionicons name="help-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Image
                source={{ uri: "https://via.placeholder.com/30" }}
                style={styles.achievementIcon}
              />
              <Text style={styles.sectionTitle}>
                {profile?.achievements.length || 0} achievements
              </Text>
            </View>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.achievementsGrid}>
            {profile?.achievements.slice(0, 4).map((achievement, index) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <Text style={styles.achievementEmoji}>{achievement.icon}</Text>
                <Text style={styles.achievementTitle}>{achievement.title}</Text>
                <Text style={styles.achievementDescription}>
                  {achievement.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsList}>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/edit-profile")}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="person-outline" size={24} color="#666" />
                <Text style={styles.settingText}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/goals-tracking")}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="fitness-outline" size={24} color="#666" />
                <Text style={styles.settingText}>Goals & Tracking</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => router.push("/budget")}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="wallet-outline" size={24} color="#666" />
                <Text style={styles.settingText}>Budget</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Premium Button */}
        {profile?.subscriptionTier !== "premium" && (
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={handleUpgrade}
          >
            <Ionicons name="star" size={24} color="white" />
            <Text style={styles.premiumButtonText}>Switch to Premium</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/")}
        >
          <Ionicons name="home-outline" size={24} color="#666" />
          <Text style={styles.tabText}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/history")}
        >
          <Ionicons name="time-outline" size={24} color="#666" />
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, styles.chatTab]}
          onPress={() => {
            router.push("/");
            router.setParams({ openChat: "true" });
          }}
        >
          <View style={styles.chatButton}>
            <Ionicons name="chatbubble" size={24} color="white" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => router.push("/insights")}
        >
          <Ionicons name="stats-chart" size={24} color="#666" />
          <Text style={styles.tabText}>Insights</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Ionicons name="person" size={24} color="#4CAF50" />
          <Text style={[styles.tabText, { color: "#4CAF50" }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  errorText: {
    color: "#FF6B6B",
    textAlign: "center",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: "white",
    padding: 24,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    marginBottom: 16,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  username: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  membershipStatus: {
    fontSize: 16,
    color: "#666",
    marginBottom: 12,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  streakText: {
    fontSize: 14,
    color: "#666",
  },
  section: {
    backgroundColor: "white",
    marginTop: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  achievementIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  seeAllButton: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "500",
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  achievementEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  achievementDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  settingsList: {
    marginTop: 8,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: "#333",
  },
  premiumButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  premiumButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "white",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    flex: 1,
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  chatTab: {
    marginTop: -20,
  },
  chatButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
