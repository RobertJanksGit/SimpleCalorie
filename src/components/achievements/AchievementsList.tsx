import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { AchievementCard } from "./AchievementCard";
import {
  Achievement,
  UserAchievements,
  AchievementCategory,
} from "../../types/achievements";

interface AchievementsListProps {
  achievements: Achievement[];
  userAchievements: UserAchievements | null;
  isLoading?: boolean;
  onRefresh?: () => void;
}

type FilterType = "all" | "earned" | "locked";

const ITEMS_PER_PAGE = 10;

export function AchievementsList({
  achievements,
  userAchievements,
  isLoading = false,
  onRefresh,
}: AchievementsListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCategory, setSelectedCategory] = useState<
    AchievementCategory | "all"
  >("all");
  const [page, setPage] = useState(1);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width } = useWindowDimensions();

  const categories: (AchievementCategory | "all")[] = useMemo(
    () => ["all", "Daily", "Habit", "Goal", "Social"],
    []
  );

  const filteredAchievements = useMemo(() => {
    if (!achievements?.length) return [];

    return achievements.filter((achievement) => {
      if (!achievement?.id) return false;

      // Filter by category
      if (
        selectedCategory !== "all" &&
        achievement.category !== selectedCategory
      ) {
        return false;
      }

      // Filter by earned/locked status
      if (filter === "earned") {
        return userAchievements?.earnedAchievements?.includes(achievement.id);
      }
      if (filter === "locked") {
        return !userAchievements?.earnedAchievements?.includes(achievement.id);
      }

      return true;
    });
  }, [
    achievements,
    filter,
    selectedCategory,
    userAchievements?.earnedAchievements,
  ]);

  const paginatedAchievements = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredAchievements.slice(0, startIndex + ITEMS_PER_PAGE);
  }, [filteredAchievements, page]);

  const handleLoadMore = useCallback(() => {
    if (paginatedAchievements.length < filteredAchievements.length) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [paginatedAchievements.length, filteredAchievements.length]);

  const renderFilterButton = useCallback(
    (filterType: FilterType, label: string) => (
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === filterType && styles.filterButtonActive,
          isDark && styles.filterButtonDark,
        ]}
        onPress={() => setFilter(filterType)}
        accessible={true}
        accessibilityLabel={`Filter by ${label} achievements`}
        accessibilityState={{ selected: filter === filterType }}
      >
        <Text
          style={[
            styles.filterButtonText,
            filter === filterType && styles.filterButtonTextActive,
            isDark && styles.textDark,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    ),
    [filter, isDark]
  );

  const renderCategoryButton = useCallback(
    (category: AchievementCategory | "all") => (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryButton,
          selectedCategory === category && styles.categoryButtonActive,
          isDark && styles.categoryButtonDark,
        ]}
        onPress={() => setSelectedCategory(category)}
        accessible={true}
        accessibilityLabel={`Filter by ${category} category`}
        accessibilityState={{ selected: selectedCategory === category }}
      >
        <Text
          style={[
            styles.categoryButtonText,
            selectedCategory === category && styles.categoryButtonTextActive,
            isDark && styles.textDark,
          ]}
        >
          {category === "all" ? "All Categories" : category}
        </Text>
      </TouchableOpacity>
    ),
    [selectedCategory, isDark]
  );

  const renderItem = useCallback(
    ({ item }: { item: Achievement }) => (
      <AchievementCard
        achievement={item}
        progress={userAchievements?.progressTrackers[item.id]}
        isLocked={!userAchievements?.earnedAchievements?.includes(item.id)}
      />
    ),
    [userAchievements]
  );

  const keyExtractor = useCallback((item: Achievement) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={[styles.loadingText, isDark && styles.textDark]}>
          Loading achievements...
        </Text>
      </View>
    );
  }

  if (!achievements?.length) {
    return (
      <View style={[styles.emptyContainer, isDark && styles.containerDark]}>
        <Text style={[styles.emptyText, isDark && styles.textDark]}>
          No achievements available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <View style={styles.filtersContainer}>
        <View style={styles.filterButtons}>
          {renderFilterButton("all", "All")}
          {renderFilterButton("earned", "Earned")}
          {renderFilterButton("locked", "Locked")}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          renderItem={({ item }) => renderCategoryButton(item)}
          keyExtractor={(item) => item}
          style={styles.categoryList}
          contentContainerStyle={styles.categoryListContent}
        />
      </View>

      <FlatList
        data={paginatedAchievements}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        onRefresh={onRefresh}
        refreshing={isLoading}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: 120, // Approximate height of each item
          offset: 120 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  containerDark: {
    backgroundColor: "#121212",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  filtersContainer: {
    paddingVertical: 16,
  },
  filterButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  filterButtonDark: {
    backgroundColor: "#2a2a2a",
  },
  filterButtonActive: {
    backgroundColor: "#4CAF50",
  },
  filterButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  categoryList: {
    flexGrow: 0,
  },
  categoryListContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: "#fff",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  categoryButtonDark: {
    backgroundColor: "#2a2a2a",
  },
  categoryButtonActive: {
    backgroundColor: "#2196F3",
  },
  categoryButtonText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  listContent: {
    paddingBottom: 16,
  },
  textDark: {
    color: "#fff",
  },
});
