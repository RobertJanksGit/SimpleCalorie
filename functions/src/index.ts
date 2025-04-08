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

// Health check endpoint
export const healthCheck = onRequest(
  { region: "us-central1" },
  async (req, res) => {
    res.status(200).send("OK");
  }
);

// Add this helper function at the top level
function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
            'You are a nutrition analysis assistant. Analyze food images and provide detailed nutritional information in valid JSON format ONLY. Your response must be parseable by JSON.parse(). If you cannot confidently identify the food or estimate its nutritional content, respond with {"error": "reason for failure"}. Follow this exact format for successful analysis: {"foodName": "name", "servingSize": "size", "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "confidence": number, "ingredients": ["item1","item2"], "mealType": "type", "portionEstimate": "estimate", "healthScore": number, "warnings": ["warning1"] }',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food photo and provide detailed nutritional information in JSON format. If you cannot confidently identify the food or estimate its nutritional content, respond with an error. Be conservative with portion sizes and nutritional estimates.",
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

    // Check if AI returned an error
    if (analysis.error) {
      throw new Error(`AI Analysis Failed: ${analysis.error}`);
    }

    // Check confidence threshold
    if (Number(analysis.confidence) < 0.6) {
      throw new Error("Low confidence in food analysis");
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
    };

    // Reject if essential values are missing or zero
    if (
      validatedAnalysis.calories === 0 ||
      (validatedAnalysis.protein === 0 &&
        validatedAnalysis.carbs === 0 &&
        validatedAnalysis.fat === 0)
    ) {
      throw new Error("Unable to determine nutritional content");
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
      const timestamp = pathParts[1].split(".")[0];
      const date = getLocalDate(); // Use local date

      try {
        // Analyze the photo using OpenAI
        const analysis = await analyzeFoodPhoto(event.data.name);

        // Get a public URL for the image
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
          event.data.bucket
        }/o/${encodeURIComponent(event.data.name)}?alt=media`;

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
          .collection("meals")
          .doc(timestamp);

        await userMealRef.set({
          ...analysis,
          ...macroPercentages,
          photoUrl: publicUrl,
          timestamp: new Date().toISOString(),
          status: "completed",
          updatedAt: new Date().toISOString(),
        });

        // Update daily totals
        await updateDailyTotals(userId, date, analysis);

        logger.info("Analysis saved successfully", {
          userId,
          date,
          timestamp,
          analysis,
        });

        return { success: true, data: analysis };
      } catch (error) {
        // Save error status to Firestore for the frontend to handle
        const userMealRef = db
          .collection("users")
          .doc(userId)
          .collection("logs")
          .doc(date)
          .collection("meals")
          .doc(timestamp);

        await userMealRef.set({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        logger.error("Analysis failed", {
          userId,
          date,
          timestamp,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        throw error;
      }
    } catch (error) {
      logger.error("Error processing photo", error);
      throw error;
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
          model: "gpt-4-turbo-preview",
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
