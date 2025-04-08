import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardEvent,
  ViewStyle,
  TextStyle,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { useDailyTotals } from "../hooks/useDailyTotals";

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Default chat height (about 60% of screen height)
const DEFAULT_CHAT_HEIGHT = Math.min(screenHeight * 0.5, 400);

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
  mealId?: string;
  isAdjustment?: boolean;
}

interface TypingIndicatorProps {
  isVisible: boolean;
}

interface ChatUIProps {
  isVisible: boolean;
  onClose: () => void;
  userId?: string;
  showPhotoConfirmation?: boolean;
}

type ChatStyles = {
  overlay: ViewStyle;
  chatWrapper: ViewStyle;
  chatContainer: ViewStyle;
  header: ViewStyle;
  closeButton: ViewStyle;
  messageContainer: ViewStyle;
  messageList: ViewStyle;
  messageRow: ViewStyle;
  messageBubble: ViewStyle;
  userBubble: ViewStyle;
  assistantBubble: ViewStyle;
  messageText: TextStyle;
  userText: TextStyle;
  assistantText: TextStyle;
  assistantAvatar: ViewStyle;
  avatarImage: ViewStyle;
  avatarHead: ViewStyle;
  userAvatar: ViewStyle;
  inputContainer: ViewStyle;
  inputWrapper: ViewStyle;
  input: TextStyle;
  sendButton: ViewStyle;
  analysisBubble: ViewStyle;
  analysisText: TextStyle;
  adjustmentBubble: ViewStyle;
  adjustmentText: TextStyle;
  nutritionBubble: ViewStyle;
  nutritionText: TextStyle;
};

const TypingIndicator = ({ isVisible }: TypingIndicatorProps) => {
  const [dots] = useState([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]);

  useEffect(() => {
    if (isVisible) {
      const animations = dots.map((dot, index) =>
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.timing(dot, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
              }),
            ])
          ),
        ])
      );

      Animated.parallel(animations).start();
    } else {
      dots.forEach((dot) => {
        dot.setValue(0);
        dot.stopAnimation();
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <View style={styles.messageRow}>
      <View style={styles.assistantAvatar}>
        <View style={styles.avatarImage}>
          <View style={styles.avatarHead} />
        </View>
      </View>
      <View
        style={[
          styles.messageBubble,
          styles.assistantBubble,
          { paddingVertical: 12, paddingHorizontal: 16 },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {dots.map((dot, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.messageText,
                {
                  opacity: dot,
                  marginHorizontal: 2,
                  fontSize: 20,
                },
              ]}
            >
              .
            </Animated.Text>
          ))}
        </View>
      </View>
    </View>
  );
};

export default function ChatUI({
  isVisible,
  onClose,
  userId = "testUser",
  showPhotoConfirmation = false,
}: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [currentMealId, setCurrentMealId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { totals, goals, getRemainingCalories, getMacroPercentages } =
    useDailyTotals(userId);

  // Helper function to add a message with delay
  const addMessageWithDelay = async (message: Message, delay: number) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, delay));
    setIsTyping(false);
    setMessages((prev) => [...prev, message]);
  };

  // Function to simulate typing delay based on message length
  const getTypingDelay = (text: string) => {
    // Average typing speed (characters per minute)
    const typingSpeed = 800;
    // Minimum delay of 500ms, plus additional time based on message length
    return Math.min(Math.max(500, text.length * (60000 / typingSpeed)), 2000);
  };

  // Function to generate daily summary message
  const generateDailySummary = () => {
    const remaining = getRemainingCalories();
    const macroPercentages = getMacroPercentages();

    let summaryText = `📊 Here's how your day looks:\n\n`;
    summaryText += `🎯 Calories: ${totals?.calories || 0} / ${
      goals.calories
    }\n`;
    summaryText += `${remaining > 0 ? "⬇️" : "⬆️"} ${Math.abs(
      remaining
    )} calories ${remaining > 0 ? "remaining" : "over"}\n\n`;

    summaryText += `💪 Macronutrients:\n\n`;
    summaryText += `🥩 Protein: ${totals?.protein || 0}g / ${goals.protein}g\n`;
    summaryText += `🌾 Carbs: ${totals?.carbs || 0}g / ${goals.carbs}g\n`;
    summaryText += `🥑 Fat: ${totals?.fat || 0}g / ${goals.fat}g\n\n`;

    // Add contextual feedback
    if (remaining < 200 && remaining > 0) {
      summaryText += "🎯 You're almost at your calorie goal for today!";
    } else if (remaining <= 0) {
      summaryText += "⚠️ You've reached your calorie goal for today.";
    } else if (remaining > goals.calories * 0.7) {
      summaryText += "📝 Still plenty of room in your calorie budget.";
    } else {
      summaryText += "👍 You're making good progress today!";
    }

    return summaryText;
  };

  // Reset messages and show greeting when chat becomes visible
  useEffect(() => {
    if (isVisible) {
      setMessages([]);
      setIsTyping(false);

      const initializeChat = async () => {
        // Initial greeting
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setIsTyping(false);

        const greetingMessage: Message = {
          id: Date.now().toString(),
          text: "👋 Hi there! Let me update you on your nutrition for today.",
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages([greetingMessage]);

        // Show typing indicator for summary
        setIsTyping(true);
        const summaryText = generateDailySummary();
        await new Promise((resolve) =>
          setTimeout(resolve, getTypingDelay(summaryText))
        );
        setIsTyping(false);

        const summaryMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: summaryText,
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, summaryMessage]);

        // Final help message
        setIsTyping(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsTyping(false);

        const helpMessage: Message = {
          id: (Date.now() + 2).toString(),
          text: "💬 Ask me about your calories, macros, or for nutrition suggestions!",
          sender: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, helpMessage]);
      };

      initializeChat();
    } else {
      // Clear messages when chat is closed
      setMessages([]);
      setInputText("");
      setIsTyping(false);
    }
  }, [isVisible, totals, goals]);

  // Calculate chat height based on keyboard
  const getChatHeight = () => {
    const availableHeight = screenHeight - keyboardHeight - 32; // 32 for margins
    const maxHeight =
      keyboardHeight > 0 ? availableHeight - 20 : DEFAULT_CHAT_HEIGHT;
    return Math.min(DEFAULT_CHAT_HEIGHT, maxHeight);
  };

  useEffect(() => {
    const keyboardWillShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      keyboardWillShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      keyboardWillHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    setLoading(true);
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    try {
      let responseText = "";
      const date = new Date().toISOString().split("T")[0];

      if (
        inputText.toLowerCase().includes("calories") ||
        inputText.toLowerCase().includes("progress") ||
        inputText.toLowerCase().includes("macros")
      ) {
        responseText = generateDailySummary();
      } else if (inputText.toLowerCase().includes("protein")) {
        // Get today's logs for protein
        const logsRef = doc(db, `users/${userId}/logs/${date}`);
        const logsSnap = await getDoc(logsRef);
        const dailyData = logsSnap.data() || {
          protein: { current: 0, goal: 120 },
        };

        responseText = `You've consumed ${dailyData.protein.current}g out of your ${dailyData.protein.goal}g protein goal today. Good sources of protein include chicken, eggs, tofu, greek yogurt, lentils, and whey protein.`;
      } else if (inputText.toLowerCase().includes("calories")) {
        // Get today's logs for calories
        const logsRef = doc(db, `users/${userId}/logs/${date}`);
        const logsSnap = await getDoc(logsRef);
        const dailyData = logsSnap.data() || {
          calories: { current: 0, goal: 2000 },
        };

        const remaining = dailyData.calories.goal - dailyData.calories.current;
        responseText = `You have ${remaining} calories remaining from your ${dailyData.calories.goal} calorie goal today.`;
      } else {
        responseText =
          "I can help you track your nutrition. Ask me about your calories, macros, or for nutrition suggestions!";
      }

      // Add a small delay before showing the response
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      };

      // Add the message with a typing delay
      await addMessageWithDelay(assistantMessage, getTypingDelay(responseText));
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I had trouble processing your request. Please try again.",
        sender: "assistant",
        timestamp: new Date(),
      };
      await addMessageWithDelay(errorMessage, 1000);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";
    const isAnalysis = !isUser && item.text.includes("logged your meal");
    const isNutrition =
      !isUser && item.text.includes("Daily Nutrition Summary");
    const isAdjustment = !isUser && item.isAdjustment;

    return (
      <View style={styles.messageRow}>
        {!isUser && (
          <View style={styles.assistantAvatar}>
            <View style={styles.avatarImage}>
              <View style={styles.avatarHead} />
            </View>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
            isAnalysis && styles.analysisBubble,
            isNutrition && styles.nutritionBubble,
            isAdjustment && styles.adjustmentBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
              isAnalysis && styles.analysisText,
              isNutrition && styles.nutritionText,
              isAdjustment && styles.adjustmentText,
            ]}
          >
            {item.text}
          </Text>
        </View>
        {isUser && (
          <View style={styles.userAvatar}>
            <Ionicons name="happy" size={24} color="#999" />
          </View>
        )}
      </View>
    );
  };

  if (!isVisible) return null;

  const chatHeight = getChatHeight();

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View
            style={[styles.chatWrapper, { marginBottom: keyboardHeight + 16 }]}
          >
            <View style={[styles.chatContainer, { height: chatHeight }]}>
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.messageContainer}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messageList}
                  showsVerticalScrollIndicator={true}
                  ListFooterComponent={() => (
                    <TypingIndicator isVisible={isTyping} />
                  )}
                  onContentSizeChange={() => {
                    if (flatListRef.current) {
                      flatListRef.current.scrollToEnd({ animated: true });
                    }
                  }}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <View style={styles.userAvatar}>
                    <Ionicons name="happy" size={24} color="#999" />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Message"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSendMessage}
                    disabled={loading || inputText.trim() === ""}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={24}
                      color={
                        loading || inputText.trim() === "" ? "#ccc" : "white"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create<ChatStyles>({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 1000,
  },
  chatWrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  chatContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  messageContainer: {
    flex: 1,
  },
  messageList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 16,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  userBubble: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "#eee",
  },
  assistantBubble: {
    backgroundColor: "#e8f5e9",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  userText: {
    color: "#000",
  },
  assistantText: {
    color: "#000",
  },
  assistantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarHead: {
    width: 20,
    height: 12,
    backgroundColor: "#fff",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    position: "absolute",
    top: 6,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    padding: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxHeight: 100,
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    marginHorizontal: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
  },
  analysisBubble: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#059669",
    padding: 16,
  },
  analysisText: {
    color: "#059669",
    fontWeight: "600",
    fontSize: 16,
    lineHeight: 24,
  },
  adjustmentBubble: {
    backgroundColor: "#f0f9ff", // Tailwind blue-50
    borderWidth: 1,
    borderColor: "#3b82f6", // Tailwind blue-500
  },
  adjustmentText: {
    color: "#3b82f6", // Tailwind blue-500
    fontWeight: "600",
    fontSize: 16,
  },
  nutritionBubble: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#22c55e",
    padding: 16,
  },
  nutritionText: {
    color: "#15803d",
    fontSize: 16,
    lineHeight: 24,
  },
});
