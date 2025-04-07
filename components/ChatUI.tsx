import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import { format } from "date-fns";

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

    // In a real app, we would fetch the chat history from Firestore
    // This would be something like:
    /*
    if (userId) {
      const unsubscribe = firestore()
        .collection('users')
        .doc(userId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
          const fetchedMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp.toDate(),
          })) as Message[];
          setMessages(fetchedMessages);
        });
      
      return () => unsubscribe();
    }
    */
  }, [userId, showPhotoConfirmation]);

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
      // Handle different types of user queries
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

      // Scroll to the bottom of the chat
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 1000);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    return (
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
        <Text style={styles.timestamp}>{format(item.timestamp, "HH:mm")}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.chatContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nutrition Assistant</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onLayout={() => {
              if (flatListRef.current && messages.length > 0) {
                flatListRef.current.scrollToEnd({ animated: false });
              }
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={100}
            style={styles.inputContainer}
          >
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              disabled={loading || inputText.trim() === ""}
            >
              <Ionicons
                name="send"
                size={24}
                color={loading || inputText.trim() === "" ? "#ccc" : "#4CAF50"}
              />
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  chatContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
    padding: 15,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  messageList: {
    paddingVertical: 10,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginVertical: 5,
  },
  userBubble: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#F0F0F0",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: "#000",
  },
  assistantText: {
    color: "#000",
  },
  timestamp: {
    fontSize: 10,
    color: "#999",
    alignSelf: "flex-end",
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    padding: 5,
  },
});
