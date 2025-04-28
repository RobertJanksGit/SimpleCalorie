import { Achievement } from "../types/achievements";

export const defaultAchievements: Achievement[] = [
  {
    id: "first_meal_log",
    name: "First Steps",
    description: "Log your first meal",
    category: "Daily",
    type: "single",
    criteria: {
      action: "meal_log",
      count: 1,
    },
    reward: {
      points: 10,
      badge: "first_meal",
    },
    hidden: false,
  },
  {
    id: "week_streak",
    name: "Consistency Champion",
    description: "Log meals for 7 consecutive days",
    category: "Habit",
    type: "streak",
    criteria: {
      action: "daily_log",
      count: 7,
    },
    reward: {
      points: 50,
      badge: "week_streak",
    },
    hidden: false,
  },
  {
    id: "calorie_goal_master",
    name: "Goal Crusher",
    description: "Meet your calorie goal for 5 consecutive days",
    category: "Goal",
    type: "streak",
    criteria: {
      action: "calorie_goal_met",
      count: 5,
    },
    reward: {
      points: 30,
      badge: "goal_master",
    },
    hidden: false,
  },
  {
    id: "photo_logger",
    name: "Snap Master",
    description: "Log 50 meals with photos",
    category: "Habit",
    type: "cumulative",
    criteria: {
      action: "photo_log",
      count: 50,
    },
    reward: {
      points: 100,
      badge: "camera_pro",
    },
    hidden: false,
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Log a meal after 10 PM",
    category: "Daily",
    type: "single",
    criteria: {
      action: "late_night_log",
      conditions: {
        timeAfter: "22:00",
      },
    },
    reward: {
      points: 15,
      badge: "night_owl",
    },
    hidden: true,
  },
];
