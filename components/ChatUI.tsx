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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Default chat height (about 60% of screen height)
const DEFAULT_CHAT_HEIGHT = Math.min(screenHeight * 0.5, 400);

type Message = {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
};

interface ChatUIProps {
  isVisible: boolean;
  onClose: () => void;
  userId?: string;
  showPhotoConfirmation?: boolean;
}

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
  const flatListRef = useRef<FlatList>(null);

  // Mock nutritional data that would normally come from Firestore
  const mockNutritionalData = {
    caloriesRemaining: 1370,
    caloriesGoal: 2000,
    percentRemaining: 69,
    protein: {
      current: 59,
      goal: 120,
      percent: 49,
    },
    carbs: {
      current: 35,
      goal: 250,
      percent: 14,
    },
  };

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

  useEffect(() => {
    // Initial welcome message
    const initialMessages: Message[] = [
      {
        id: "1",
        text: "Hello! How can I assist you with your nutrition today?",
        sender: "assistant",
        timestamp: new Date(),
      },
    ];

    // Add photo confirmation message if specified
    if (showPhotoConfirmation) {
      initialMessages.push({
        id: "2",
        text: "I've logged your meal! Added 300 calories, 25g protein, and 15g carbs to your daily total.",
        sender: "assistant",
        timestamp: new Date(),
      });
    }

    setMessages(initialMessages);
  }, [userId, showPhotoConfirmation]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim() === "") return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages([...messages, newUserMessage]);
    setInputText("");
    setLoading(true);

    // Simulate response delay
    setTimeout(() => {
      let responseText = "";

      if (inputText.toLowerCase().includes("protein")) {
        responseText =
          "Good sources of protein include chicken, eggs, tofu, greek yogurt, lentils, and whey protein. You currently have 59g of 120g protein goal for today.";
      } else if (inputText.toLowerCase().includes("calories")) {
        responseText = `You have ${mockNutritionalData.caloriesRemaining} calories remaining from your ${mockNutritionalData.caloriesGoal} calorie goal today.`;
      } else {
        responseText =
          "I can help you track your nutrition. Ask me about your calories, macros, or for nutrition suggestions!";
      }

      const newAssistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newAssistantMessage]);
      setLoading(false);
    }, 1000);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

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
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
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
                <View style={styles.headerContent}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeButton}
                  >
                    <View style={styles.closeBar} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.closeXButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.messageContainer}>
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messageList}
                  showsVerticalScrollIndicator={true}
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
                    onPress={handleSend}
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

const styles = StyleSheet.create({
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
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerContent: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    width: 48,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  closeBar: {
    width: 32,
    height: 4,
    backgroundColor: "#ddd",
    borderRadius: 2,
  },
  closeXButton: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
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
    padding: 12,
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
    lineHeight: 22,
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
});
