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
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
  Timestamp,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useDailyTotals } from "../hooks/useDailyTotals";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "expo-router";

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Default chat height (about 60% of screen height)
const DEFAULT_CHAT_HEIGHT = Math.min(screenHeight * 0.5, 400);

interface Message {
  id: string;
  message: string;
  sender: "user" | "ai";
  timestamp: string;
  context: {
    date: string;
  };
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
  emptyContainer: ViewStyle;
  welcomeBubble: ViewStyle;
  errorContainer: ViewStyle;
  errorText: TextStyle;
  retryButton: ViewStyle;
  retryButtonText: TextStyle;
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { totals, goals } = useDailyTotals(userId);
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  // Use the authenticated user's ID instead of the passed userId if available
  const authenticatedUserId = user?.uid || userId;

  // Initialize Firebase Functions
  const functions = getFunctions();
  const chatWithAI = httpsCallable(functions, "chatWithAI");

  // Add component mount check for authentication
  useEffect(() => {
    // Log current authentication state when component mounts
    const auth = getAuth();
    console.log(`[ChatUI] Component mounted with auth state:`, {
      isAuthenticated,
      contextUserId: user?.uid,
      currentUser: auth.currentUser?.uid,
      providedUserId: userId,
      usedUserId: authenticatedUserId,
    });
  }, []);

  // Subscribe to chat history when chat becomes visible
  useEffect(() => {
    if (!isVisible || !authenticatedUserId) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      console.log("[ChatUI] User is not authenticated");
      setPermissionError(true);
      setInitialLoading(false);
      return;
    }

    setInitialLoading(true);
    setPermissionError(false);
    const today = new Date().toISOString().split("T")[0];
    console.log(
      `[ChatUI] Fetching chat history for user ${authenticatedUserId} and date ${today}`
    );

    // Verify current auth state
    const auth = getAuth();
    if (auth.currentUser?.uid !== authenticatedUserId) {
      console.warn(
        `[ChatUI] Auth mismatch: Current user ${auth.currentUser?.uid} vs expected ${authenticatedUserId}`
      );
    }

    const chatRef = collection(db, `users/${authenticatedUserId}/chatHistory`);
    const q = query(
      chatRef,
      where("context.date", "==", today),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[ChatUI] Received ${snapshot.docs.length} messages`);
        const newMessages: Message[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Message, "id">),
        }));
        setMessages(newMessages);
        setInitialLoading(false);
      },
      (error) => {
        console.error("Error fetching chat messages:", error);
        console.error(
          `[ChatUI] Document path: users/${authenticatedUserId}/chatHistory`
        );
        const auth = getAuth();
        console.error(
          `[ChatUI] Auth state:`,
          !!auth.currentUser,
          "User ID:",
          auth.currentUser?.uid
        );
        console.error(
          `[ChatUI] Context auth state:`,
          isAuthenticated,
          "User ID:",
          user?.uid
        );
        setInitialLoading(false);
        setPermissionError(true);
      }
    );

    return () => unsubscribe();
  }, [isVisible, authenticatedUserId, isAuthenticated, user]);

  // Handle keyboard showing/hiding
  useEffect(() => {
    const keyboardWillShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Scroll to bottom after keyboard appears
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Show welcome typing indicator when chat opens with no messages
  useEffect(() => {
    if (isVisible && !initialLoading && messages.length === 0) {
      setIsTyping(true);

      // Hide typing indicator after a delay if no messages arrive
      const timer = setTimeout(() => {
        setIsTyping(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, initialLoading, messages.length]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || loading) return;

    // Check if user is authenticated
    if (!isAuthenticated) {
      alert("You must be logged in to use the chat feature.");
      return;
    }

    setLoading(true);
    setIsTyping(true);
    const userMessage = inputText.trim();
    setInputText("");

    // Log authentication state
    console.log(`[ChatUI] Sending message as user: ${authenticatedUserId}`);
    console.log(`[ChatUI] Authentication status: ${isAuthenticated}`);

    // Set a timeout to hide the typing indicator after 20 seconds
    const typingTimeout = setTimeout(() => {
      setIsTyping(false);
    }, 20000);

    try {
      // Try writing directly to Firestore first as a test
      const today = new Date().toISOString().split("T")[0];
      const chatRef = collection(
        db,
        `users/${authenticatedUserId}/chatHistory`
      );

      // Attempt direct write (bypassing cloud function) to test permissions
      try {
        const directMessage = {
          message: userMessage,
          sender: "user",
          timestamp: new Date().toISOString(),
          context: {
            date: today,
          },
        };

        await addDoc(chatRef, directMessage);
        console.log(`[ChatUI] Successfully wrote user message directly`);
      } catch (directWriteError) {
        console.error(`[ChatUI] Direct write failed:`, directWriteError);
        // Continue to try the cloud function even if direct write fails
      }

      // Call the chatWithAI function
      console.log(
        `[ChatUI] Calling cloud function with message: ${userMessage.substring(
          0,
          20
        )}...`
      );
      const result = await chatWithAI({ message: userMessage });
      console.log(`[ChatUI] Cloud function response:`, result.data);

      // Response will be handled by the Firestore listener
    } catch (error) {
      console.error("Error sending message:", error);

      // Try to get more detailed error information
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorDetails = JSON.stringify(error, null, 2);
      console.error(`[ChatUI] Error details: ${errorMessage}`);
      console.error(`[ChatUI] Full error: ${errorDetails}`);

      // Add error message locally
      const errorMsg: Message = {
        id: Date.now().toString(),
        message: `Sorry, I encountered an error: ${errorMessage}. Please try again or check your connection.`,
        sender: "ai",
        timestamp: new Date().toISOString(),
        context: {
          date: new Date().toISOString().split("T")[0],
        },
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      clearTimeout(typingTimeout);
      setLoading(false);
      setIsTyping(false);
    }
  };

  // Add testing function to directly write to Firestore
  const testFirestorePermissions = async () => {
    try {
      if (!isAuthenticated) {
        console.log(
          "[ChatUI] Cannot test permissions - user not authenticated"
        );
        alert("You must be logged in to use the chat feature.");
        return;
      }

      setLoading(true);
      const today = new Date().toISOString().split("T")[0];
      console.log(
        `[ChatUI] Testing write to chatHistory for user ${authenticatedUserId}`
      );

      // Test writing directly to chatHistory collection
      const chatRef = collection(
        db,
        `users/${authenticatedUserId}/chatHistory`
      );
      const testMessage = {
        message: "Test message from app",
        sender: "user",
        timestamp: new Date().toISOString(),
        context: {
          date: today,
        },
      };

      const result = await addDoc(chatRef, testMessage);
      console.log(`[ChatUI] Successfully wrote test message: ${result.id}`);
      setPermissionError(false);
    } catch (error) {
      console.error("Error writing test message:", error);
      alert("Permission test failed. Please make sure you're signed in.");
      setPermissionError(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to navigate to auth screen
  const goToSignIn = () => {
    onClose(); // Close the chat UI
    router.push("/auth"); // Navigate to auth screen
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
            {item.message}
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

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <View style={styles.chatWrapper}>
          <View style={[styles.chatContainer, { height: DEFAULT_CHAT_HEIGHT }]}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Messages Container */}
            <View style={styles.messageContainer}>
              {initialLoading ? (
                <View style={styles.messageList}>
                  <TypingIndicator isVisible={true} />
                </View>
              ) : permissionError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={40} color="#f44336" />
                  <Text style={styles.errorText}>
                    {isAuthenticated
                      ? "Unable to load messages. There might be a connection issue."
                      : "You need to be signed in to use the chat feature."}
                  </Text>
                  {!isAuthenticated ? (
                    <TouchableOpacity
                      onPress={goToSignIn}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryButtonText}>Sign In</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={testFirestorePermissions}
                      style={styles.retryButton}
                    >
                      <Text style={styles.retryButtonText}>
                        Test Connection
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.messageList}
                  showsVerticalScrollIndicator={true}
                  scrollEnabled={true}
                  maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                  ListFooterComponent={
                    isTyping ? <TypingIndicator isVisible={true} /> : null
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <View style={styles.assistantAvatar}>
                        <View style={styles.avatarImage}>
                          <View style={styles.avatarHead} />
                        </View>
                      </View>
                      <View
                        style={[
                          styles.messageBubble,
                          styles.assistantBubble,
                          styles.welcomeBubble,
                        ]}
                      >
                        <Text style={styles.messageText}>
                          Hi there! I'm your nutrition assistant. Ask me about
                          your calories, macros, or for meal suggestions based
                          on your nutritional goals.
                        </Text>
                      </View>
                    </View>
                  }
                  onContentSizeChange={() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }}
                  onLayout={() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }}
                />
              )}
            </View>

            {/* Input Container */}
            <View style={styles.inputWrapper}>
              <View style={styles.userAvatar}>
                <Ionicons name="happy" size={24} color="#999" />
              </View>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={
                  !isAuthenticated ? "Please sign in to chat" : "Message"
                }
                placeholderTextColor="#999"
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={handleSendMessage}
                editable={isAuthenticated && !permissionError}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!isAuthenticated || permissionError) && {
                    backgroundColor: "#ccc",
                  },
                ]}
                onPress={handleSendMessage}
                disabled={
                  loading ||
                  inputText.trim() === "" ||
                  !isAuthenticated ||
                  permissionError
                }
              >
                <Ionicons
                  name="arrow-forward"
                  size={24}
                  color={
                    loading ||
                    inputText.trim() === "" ||
                    !isAuthenticated ||
                    permissionError
                      ? "#eee"
                      : "white"
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
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
    width: "100%",
  },
  messageList: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
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
    borderWidth: 1,
    borderColor: "#c8e6c9",
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
  emptyContainer: {
    padding: 16,
    flex: 1,
    alignItems: "flex-start",
  },
  welcomeBubble: {
    marginTop: 12,
    maxWidth: "85%",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#4CAF50",
    borderRadius: 20,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
