/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as cors from "cors";
import { UserRecord } from "firebase-admin/auth";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

// Initialize Firebase Admin
initializeApp();

// Get Firestore instance
const db = getFirestore();

// Define OpenAI API key secret
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Initialize CORS middleware
const corsHandler = cors({ origin: true });

interface FoodAnalysis {
  foodName: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  confidence: number;
  ingredients: string[];
  mealType: string;
  portionEstimate: string;
  healthScore: number;
  warnings: string[];
  analysisNotes: string;
}

interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  meals: number;
  lastUpdated?: string;
}

interface ChatMessage {
  message: string;
  sender: "user" | "ai";
  timestamp: string;
  context: {
    date: string;
  };
}

// Health check endpoint
export const healthCheck = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    res.status(200).send("OK");
  }
);

// Add timezone offset constant (for Eastern Time, UTC-4)
const TIMEZONE_OFFSET = -4;

// Update getLocalDate function to use specific timezone
function getLocalDate(): string {
  // Get current date in UTC
  const now = new Date();

  // Calculate the offset in milliseconds
  const offsetMs = TIMEZONE_OFFSET * 60 * 60 * 1000;

  // Create a new date by subtracting the offset
  const localDate = new Date(now.getTime() + offsetMs);

  // Format as YYYY-MM-DD using UTC methods to avoid any additional timezone conversions
  return localDate.toISOString().split("T")[0];
}

/**
 * Analyzes a food photo using OpenAI's Vision API
 */
async function analyzeFoodPhoto(storagePath: string): Promise<FoodAnalysis> {
  try {
    // Get a reference to the file in Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    // Download the file directly
    const [buffer] = await file.download();
    const base64Image = buffer.toString("base64");

    const openai = new OpenAI({
      apiKey: openaiApiKey.value(),
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            'You are a nutrition analysis assistant. Your primary task is to analyze food images and provide detailed nutritional information in valid JSON format ONLY. Your response must be parseable by JSON.parse(). First, determine if the image contains food. If the image does not contain food or is too blurry/unclear, respond with {"error": "No food detected in image"}. For food images, assess your confidence in the analysis on a scale of 0-1. If you can identify the food but are less certain about portions or exact nutritional content, still provide an estimate but with a lower confidence score. Follow this exact format: {"foodName": "name", "servingSize": "size", "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "confidence": number (0-1), "ingredients": ["item1","item2"], "mealType": "type", "portionEstimate": "estimate", "healthScore": number (0-100), "warnings": ["warning1"], "analysisNotes": "Any specific notes about the analysis confidence or limitations"}',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image. First determine if it contains food. If it does, provide nutritional analysis. Be conservative with portion sizes and nutritional estimates. Include any uncertainty in the confidence score and analysis notes.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    let analysis = JSON.parse(content);

    // Check if AI returned an error (no food detected)
    if (analysis.error) {
      throw new Error(analysis.error);
    }

    // Validate and cap nutritional values
    const validatedAnalysis: FoodAnalysis = {
      foodName: analysis.foodName || "Unknown food",
      servingSize: analysis.servingSize || "1 serving",
      calories: Math.min(Math.max(Number(analysis.calories) || 0, 0), 1500),
      protein: Math.min(Math.max(Number(analysis.protein) || 0, 0), 75),
      carbs: Math.min(Math.max(Number(analysis.carbs) || 0, 0), 150),
      fat: Math.min(Math.max(Number(analysis.fat) || 0, 0), 50),
      fiber: Math.min(Math.max(Number(analysis.fiber) || 0, 0), 25),
      sugar: Math.min(Math.max(Number(analysis.sugar) || 0, 0), 50),
      confidence: Math.min(Math.max(Number(analysis.confidence) || 0, 0), 1),
      ingredients: Array.isArray(analysis.ingredients)
        ? analysis.ingredients
        : ["Unknown"],
      mealType: analysis.mealType || "Unknown",
      portionEstimate: analysis.portionEstimate || "1 portion",
      healthScore: Math.min(
        Math.max(Number(analysis.healthScore) || 50, 0),
        100
      ),
      warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
      analysisNotes: analysis.analysisNotes || "",
    };

    // Only reject if no calories or all macros are zero
    if (validatedAnalysis.calories === 0) {
      throw new Error("Unable to determine caloric content");
    }

    return validatedAnalysis;
  } catch (error) {
    logger.error("Error analyzing photo with OpenAI:", error);
    throw error;
  }
}

/**
 * Cloud Function triggered when a photo is uploaded to Firebase Storage
 */
export const analyzePhoto = onObjectFinalized(
  {
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 300,
    minInstances: 0,
    maxInstances: 10,
    secrets: [openaiApiKey],
  },
  async (event) => {
    try {
      if (!event.data.name || !event.data.bucket) {
        throw new Error("Invalid storage object");
      }

      logger.info("Processing uploaded photo", {
        bucket: event.data.bucket,
        name: event.data.name,
        contentType: event.data.contentType,
        size: event.data.size,
      });

      // Extract user ID and timestamp from the storage path
      const pathParts = event.data.name.split("/");
      if (pathParts.length < 2) {
        throw new Error("Invalid storage path format");
      }

      const userId = pathParts[0];
      const fileTimestampMs = parseInt(pathParts[1].split(".")[0]);

      // Log current time in UTC and local
      const utcNow = new Date();
      logger.info("Time debug", {
        utcTime: utcNow.toISOString(),
        utcHours: utcNow.getUTCHours(),
        localHours: utcNow.getHours(),
        timezoneOffset: utcNow.getTimezoneOffset(),
      });

      const date = getLocalDate();
      logger.info("Date calculation", {
        calculatedDate: date,
        userId,
        fileTimestampMs,
        rawTimestamp: new Date().toISOString(),
      });

      try {
        // Analyze the photo using OpenAI
        const analysis = await analyzeFoodPhoto(event.data.name);

        // Get a public URL for the image
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
          event.data.bucket
        }/o/${encodeURIComponent(event.data.name)}?alt=media`;

        // Add debug logging for the URL
        logger.info("Generated photo URL", {
          bucket: event.data.bucket,
          name: event.data.name,
          publicUrl: publicUrl,
        });

        // Calculate additional metrics
        const totalMacros =
          analysis.protein * 4 + analysis.carbs * 4 + analysis.fat * 9;
        const macroPercentages = {
          proteinPercentage: Math.round(
            ((analysis.protein * 4) / totalMacros) * 100
          ),
          carbsPercentage: Math.round(
            ((analysis.carbs * 4) / totalMacros) * 100
          ),
          fatPercentage: Math.round(((analysis.fat * 9) / totalMacros) * 100),
        };

        // Save analysis results to Firestore
        const userMealRef = db
          .collection("users")
          .doc(userId)
          .collection("logs")
          .doc(date)
          .collection("meals");

        // Find all pending meals
        const allPendingMeals = await userMealRef
          .where("status", "==", "pending")
          .get();

        // Log all pending meals to debug
        logger.info("All pending meals in collection", {
          count: allPendingMeals.size,
          meals: allPendingMeals.docs.map((doc) => ({
            id: doc.id,
            timestamp: doc.data().timestamp,
            uploadTime: new Date(doc.data().timestamp).getTime(),
          })),
        });

        // Get all pending meals that were created within 30 seconds of this upload
        const pendingMeals = allPendingMeals.docs.filter((doc) => {
          try {
            const mealData = doc.data();
            // Parse the ISO timestamp to milliseconds
            const mealTimestamp = new Date(mealData.timestamp).getTime();
            // Compare with the file timestamp (within 30 seconds)
            const timeDiffMs = Math.abs(mealTimestamp - fileTimestampMs);
            return timeDiffMs < 30000; // 30 seconds
          } catch (parseErr) {
            logger.error("Error parsing timestamp for meal", {
              docId: doc.id,
              timestamp: doc.data().timestamp,
              errorMessage:
                parseErr instanceof Error ? parseErr.message : String(parseErr),
            });
            return false;
          }
        });

        // Add debug logging for pending meals matching timestamp
        logger.info("Found pending meals matching timestamp", {
          allPendingCount: allPendingMeals.size,
          matchingCount: pendingMeals.length,
          fileTimestampMs,
          pendingMeals: pendingMeals.map((doc) => ({
            id: doc.id,
            timestamp: doc.data().timestamp,
            mealTimestamp: new Date(doc.data().timestamp).getTime(),
            diff: Math.abs(
              new Date(doc.data().timestamp).getTime() - fileTimestampMs
            ),
          })),
        });

        // Use batch for atomic operations
        const batch = db.batch();

        // Delete pending meals that match
        pendingMeals.forEach((doc) => {
          logger.info("Deleting pending meal", { id: doc.id });
          batch.delete(doc.ref);
        });

        // Create new document with analysis results
        const newMealRef = userMealRef.doc();
        batch.set(newMealRef, {
          ...analysis,
          ...macroPercentages,
          photoUrl: publicUrl,
          timestamp: new Date().toISOString(),
          status: "completed",
          updatedAt: new Date().toISOString(),
        });

        // Commit the batch
        await batch.commit();

        // Update daily totals
        await updateDailyTotals(userId, date, analysis);

        logger.info("Analysis saved successfully", {
          userId,
          date,
          fileTimestampMs,
          analysis,
        });

        return { success: true, data: analysis };
      } catch (analysisError) {
        // Find and update any pending meals to failed status
        const userMealRef = db
          .collection("users")
          .doc(userId)
          .collection("logs")
          .doc(date)
          .collection("meals");

        // Find all pending meals
        const allPendingMeals = await userMealRef
          .where("status", "==", "pending")
          .get();

        // Get all pending meals that were created within 30 seconds of this upload
        const pendingMeals = allPendingMeals.docs.filter((doc) => {
          try {
            const mealData = doc.data();
            const mealTimestamp = new Date(mealData.timestamp).getTime();
            const timeDiffMs = Math.abs(mealTimestamp - fileTimestampMs);

            // Consider it a match if it's within 30 seconds (30000ms)
            return timeDiffMs < 30000;
          } catch (parseErr) {
            logger.error("Error parsing timestamp for meal", {
              docId: doc.id,
              timestamp: doc.data().timestamp,
              errorMessage:
                parseErr instanceof Error ? parseErr.message : String(parseErr),
            });
            return false;
          }
        });

        // Add debug logging for pending meals matching timestamp
        logger.info("Found pending meals to handle for error", {
          allPendingCount: allPendingMeals.size,
          matchingCount: pendingMeals.length,
          fileTimestampMs,
          pendingMeals: pendingMeals.map((doc) => ({
            id: doc.id,
            timestamp: doc.data().timestamp,
          })),
          errorMessage:
            analysisError instanceof Error
              ? analysisError.message
              : String(analysisError),
        });

        // Check if it's a "No food detected" error
        const errorMessage =
          analysisError instanceof Error
            ? analysisError.message
            : String(analysisError);
        const isNoFoodError = errorMessage.includes("No food detected");

        // Use batch for atomic operations
        const batch = db.batch();

        pendingMeals.forEach((doc) => {
          if (isNoFoodError) {
            // Delete the meal document if no food was detected
            logger.info("Deleting meal document - No food detected", {
              id: doc.id,
            });
            batch.delete(doc.ref);
          } else {
            // For other errors, mark as failed
            logger.info("Marking meal as failed", { id: doc.id });
            batch.update(doc.ref, {
              status: "failed",
              errorMessage: errorMessage,
              updatedAt: new Date().toISOString(),
            });
          }
        });

        await batch.commit();

        logger.error("Analysis failed", {
          userId,
          date,
          fileTimestampMs,
          errorMessage: errorMessage,
          isNoFoodError: isNoFoodError,
        });

        throw analysisError;
      }
    } catch (outerError) {
      logger.error("Error processing photo", {
        error:
          outerError instanceof Error ? outerError.message : String(outerError),
        stack: outerError instanceof Error ? outerError.stack : undefined,
      });
      throw outerError;
    }
  }
);

async function updateDailyTotals(
  userId: string,
  date: string,
  meal: FoodAnalysis
): Promise<void> {
  const userRef = db.collection("users").doc(userId);
  const dailyTotalsRef = userRef.collection("dailyTotals").doc(date);
  const mealsRef = userRef.collection("logs").doc(date).collection("meals");

  logger.info("Starting daily totals update", {
    userId,
    date,
    path: dailyTotalsRef.path,
  });

  try {
    await db.runTransaction(async (transaction) => {
      // Get all meals for the day
      const mealsSnapshot = await transaction.get(mealsRef);
      const dailyTotalsDoc = await transaction.get(dailyTotalsRef);

      logger.info("Found meals for the day", {
        count: mealsSnapshot.size,
        path: mealsRef.path,
        dailyTotalsExists: dailyTotalsDoc.exists,
      });

      // Calculate new totals from all meals
      const newTotals: DailyTotals = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        meals: mealsSnapshot.size,
        lastUpdated: new Date().toISOString(),
      };

      // Sum up all meals
      mealsSnapshot.forEach((doc) => {
        const mealData = doc.data();
        if (mealData.status !== "failed") {
          // Only count successful meals
          newTotals.calories += mealData.calories || 0;
          newTotals.protein += mealData.protein || 0;
          newTotals.carbs += mealData.carbs || 0;
          newTotals.fat += mealData.fat || 0;
          newTotals.fiber += mealData.fiber || 0;
          newTotals.sugar += mealData.sugar || 0;
        }
      });

      logger.info("Calculated new daily totals", {
        totals: newTotals,
        path: dailyTotalsRef.path,
      });

      // Always use set instead of update to ensure document is created
      transaction.set(dailyTotalsRef, newTotals, { merge: true });
    });

    logger.info("Daily totals update completed", {
      userId,
      date,
      path: dailyTotalsRef.path,
    });
  } catch (error) {
    logger.error("Error updating daily totals", {
      error: error instanceof Error ? error.message : "Unknown error",
      userId,
      date,
      path: dailyTotalsRef.path,
    });
    throw error;
  }
}

/**
 * Cloud Function to parse user input for meal adjustments
 */
export const parseMealAdjustment = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    secrets: [openaiApiKey],
  },
  async (req, res) => {
    return corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).send("Method not allowed");
          return;
        }

        const { userId, mealId, userInput } = req.body;
        const date = getLocalDate(); // Use local date instead of getting from request

        if (!userId || !mealId || !userInput) {
          res.status(400).send("Missing required parameters");
          return;
        }

        // Initialize OpenAI with the secret
        const openai = new OpenAI({
          apiKey: openaiApiKey.value(),
        });

        // Add debug logging
        logger.info("Processing meal adjustment", {
          userId,
          date,
          mealId,
          userInput,
        });

        // Use OpenAI to parse the user input
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a nutrition tracking assistant. Parse user input for meal adjustments.
              You must respond with ONLY a JSON object in this exact format (no other text):
              {
                "adjustments": {
                  "calories": number or null,
                  "protein": number or null,
                  "carbs": number or null,
                  "fat": number or null
                },
                "description": "A clear description of the adjustment"
              }
              Only include nutrients that are being adjusted. Numbers should be positive integers.
              Example user input: "add 2 tbsp olive oil"
              Example response: {"adjustments":{"calories":240,"fat":28},"description":"Added 2 tablespoons of olive oil (+240 calories, +28g fat)"}`,
            },
            {
              role: "user",
              content: userInput,
            },
          ],
          temperature: 0.1,
        });

        const content = completion.choices[0].message.content;
        if (!content) {
          throw new Error("No content received from OpenAI");
        }

        // Add debug logging
        logger.info("OpenAI response received", { content });

        let parsedAdjustment;
        try {
          parsedAdjustment = JSON.parse(content.trim());

          // Validate the response format
          if (!parsedAdjustment.adjustments || !parsedAdjustment.description) {
            throw new Error("Invalid response format from OpenAI");
          }

          // Ensure all adjustment values are numbers or null
          const adjustmentValues = parsedAdjustment.adjustments;
          for (const [key, value] of Object.entries(adjustmentValues)) {
            if (value !== null && typeof value !== "number") {
              adjustmentValues[key] = parseFloat(value as string) || null;
            }
          }
          parsedAdjustment.adjustments = adjustmentValues;
        } catch (error) {
          logger.error("Failed to parse OpenAI response:", { content, error });
          throw new Error("Failed to parse meal adjustment");
        }

        // Get the meal reference
        const mealRef = db
          .collection("users")
          .doc(userId)
          .collection("logs")
          .doc(date)
          .collection("meals")
          .doc(mealId);

        // Get the current meal data
        const mealDoc = await mealRef.get();
        if (!mealDoc.exists) {
          res.status(404).send("Meal not found");
          return;
        }

        const mealData = mealDoc.data();
        const adjustments = parsedAdjustment.adjustments;

        // Add debug logging
        logger.info("Current meal data", { mealData });
        logger.info("Applying adjustments", { adjustments });

        // Update the meal with adjustments
        const updates: any = {};
        if (adjustments.calories !== null)
          updates.calories = adjustments.calories;
        if (adjustments.protein !== null) updates.protein = adjustments.protein;
        if (adjustments.carbs !== null) updates.carbs = adjustments.carbs;
        if (adjustments.fat !== null) updates.fat = adjustments.fat;
        updates.lastUpdated = admin.firestore.FieldValue.serverTimestamp();

        // Use ISO string for timestamp in array
        const now = new Date().toISOString();
        updates.adjustmentHistory = admin.firestore.FieldValue.arrayUnion({
          timestamp: now,
          description: parsedAdjustment.description,
          adjustments,
        });

        // Update the meal document
        await mealRef.update(updates);

        // Update daily totals
        await updateDailyTotals(userId, date, {
          ...mealData,
          ...updates,
        } as FoodAnalysis);

        // Add debug logging
        logger.info("Meal adjustment completed successfully", {
          updates,
          description: parsedAdjustment.description,
        });

        res.status(200).json({
          success: true,
          message: parsedAdjustment.description,
          adjustments,
        });
      } catch (error) {
        // Enhanced error logging
        logger.error("Error in parseMealAdjustment:", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });

        res.status(500).json({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to process meal adjustment",
        });
      }
    });
  }
);

/**
 * Cloud Function triggered when a new user is created
 */
export const initializeUserGoals = functions.auth
  .user()
  .onCreate(async (user: UserRecord) => {
    try {
      const defaultGoals = {
        calories: 2000,
        protein: 120,
        carbs: 250,
        fat: 65,
      };

      await db
        .collection("users")
        .doc(user.uid)
        .collection("settings")
        .doc("goals")
        .set(defaultGoals);

      logger.info("User goals initialized successfully", {
        userId: user.uid,
        goals: defaultGoals,
      });
    } catch (error) {
      logger.error("Error initializing user goals:", error);
      throw error;
    }
  });

/**
 * Cloud Function for the AI chat feature
 * Allows users to chat with an AI about their nutrition
 */
export const chatWithAI = functions
  .runWith({
    memory: "256MB",
    timeoutSeconds: 60,
    secrets: [openaiApiKey],
  })
  .https.onCall(async (data, context) => {
    try {
      // Verify authentication
      if (!context.auth) {
        throw new Error("Unauthorized. User must be logged in.");
      }

      const userId = context.auth.uid;
      const userMessage = data.message;

      if (!userMessage || typeof userMessage !== "string") {
        throw new Error("Invalid message format");
      }

      // Get current date in local timezone
      const today = getLocalDate();

      // Log the request
      logger.info("Processing chat request", {
        userId,
        date: today,
        messagePreview:
          userMessage.substring(0, 50) + (userMessage.length > 50 ? "..." : ""),
      });

      // Fetch user's daily totals and goals from Firestore
      const dailyTotalsRef = db
        .collection("users")
        .doc(userId)
        .collection("dailyTotals")
        .doc(today);

      const goalsRef = db
        .collection("users")
        .doc(userId)
        .collection("settings")
        .doc("goals");

      const [dailyTotalsSnap, goalsSnap] = await Promise.all([
        dailyTotalsRef.get(),
        goalsRef.get(),
      ]);

      // Default values if data doesn't exist
      const dailyTotals = dailyTotalsSnap.exists
        ? (dailyTotalsSnap.data() as DailyTotals)
        : {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            meals: 0,
          };

      const goals = goalsSnap.exists
        ? (goalsSnap.data() as {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          })
        : { calories: 2000, protein: 120, carbs: 250, fat: 65 };

      // Calculate remaining macros for the day
      const remaining = {
        calories: Math.max(0, goals.calories - dailyTotals.calories),
        protein: Math.max(0, goals.protein - dailyTotals.protein),
        carbs: Math.max(0, goals.carbs - dailyTotals.carbs),
        fat: Math.max(0, goals.fat - dailyTotals.fat),
      };

      // Initialize OpenAI
      const openai = new OpenAI({
        apiKey: openaiApiKey.value(),
      });

      // Fetch last 5 chat messages for context
      const chatHistoryRef = db
        .collection("users")
        .doc(userId)
        .collection("chatHistory")
        .where("context.date", "==", today)
        .orderBy("timestamp", "desc")
        .limit(5);

      const chatHistorySnap = await chatHistoryRef.get();
      const chatHistory: ChatMessage[] = chatHistorySnap.docs
        .map((doc) => doc.data() as ChatMessage)
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      // Construct the messages array for OpenAI
      type ChatCompletionRole = "system" | "user" | "assistant";

      interface ChatCompletionMessage {
        role: ChatCompletionRole;
        content: string;
      }

      const messages: ChatCompletionMessage[] = [
        {
          role: "system",
          content: `You are a friendly nutrition assistant. Today is ${today}.

The user's nutritional data for today:
- Consumed: ${dailyTotals.calories} calories, ${
            dailyTotals.protein
          }g protein, ${dailyTotals.carbs}g carbs, ${dailyTotals.fat}g fat
- Daily Goals: ${goals.calories} calories, ${goals.protein}g protein, ${
            goals.carbs
          }g carbs, ${goals.fat}g fat
- Remaining: ${remaining.calories} calories, ${remaining.protein}g protein, ${
            remaining.carbs
          }g carbs, ${remaining.fat}g fat
- Meals logged today: ${dailyTotals.meals || 0}

Your role is to help the user reach their nutritional goals. Be motivational and supportive.
For meal suggestions, prioritize foods that help meet remaining macros.
Keep responses clear, concise, and actionable.
Avoid making health claims without scientific backing.`,
        },
      ];

      // Add chat history for context
      chatHistory.forEach((msg) => {
        messages.push({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.message,
        });
      });

      // Add the current user message
      messages.push({
        role: "user",
        content: userMessage,
      });

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = completion.choices[0].message.content;
      if (!aiResponse) {
        throw new Error("No response received from AI");
      }

      // Create timestamps with a 1ms difference to ensure correct ordering
      const userTimestamp = new Date().toISOString();
      const aiTimestamp = new Date(new Date().getTime() + 1).toISOString();

      // Save user message to chatHistory
      const userChatRef = db
        .collection("users")
        .doc(userId)
        .collection("chatHistory")
        .doc();

      const userChatMessage: ChatMessage = {
        message: userMessage,
        sender: "user",
        timestamp: userTimestamp,
        context: { date: today },
      };

      // Save AI response to chatHistory
      const aiChatRef = db
        .collection("users")
        .doc(userId)
        .collection("chatHistory")
        .doc();

      const aiChatMessage: ChatMessage = {
        message: aiResponse,
        sender: "ai",
        timestamp: aiTimestamp,
        context: { date: today },
      };

      // Save both messages to Firestore
      await Promise.all([
        userChatRef.set(userChatMessage),
        aiChatRef.set(aiChatMessage),
      ]);

      logger.info("Chat interaction completed successfully", {
        userId,
        date: today,
        userMessageId: userChatRef.id,
        aiResponseId: aiChatRef.id,
      });

      // Return the AI response
      return {
        response: aiResponse,
        timestamp: aiTimestamp,
        context: { date: today },
      };
    } catch (error) {
      // Enhanced error logging
      logger.error("Error in chatWithAI:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new functions.https.HttpsError(
        "internal",
        error instanceof Error
          ? error.message
          : "Unknown error processing chat request"
      );
    }
  });
