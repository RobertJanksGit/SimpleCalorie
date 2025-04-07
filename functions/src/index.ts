/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";
import * as admin from "firebase-admin";
import * as cors from "cors";

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
            'You are a nutrition analysis assistant. Analyze food images and provide detailed nutritional information in valid JSON format ONLY. Your response must be parseable by JSON.parse(). Follow this exact format: {"foodName": "name", "servingSize": "size", "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "confidence": number, "ingredients": ["item1","item2"], "mealType": "type", "portionEstimate": "estimate", "healthScore": number, "warnings": ["warning1"] }',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food photo and provide detailed nutritional information in JSON format. Include: foodName, servingSize, calories, protein, carbs, fat, fiber, sugar, confidence, ingredients, mealType, portionEstimate, healthScore, and warnings. Return ONLY valid JSON with no additional text or explanation.",
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

    let analysis;
    try {
      analysis = JSON.parse(content);

      // Ensure all required fields are present with valid data types
      const validatedAnalysis: FoodAnalysis = {
        foodName: analysis.foodName || "Unknown food",
        servingSize: analysis.servingSize || "1 serving",
        calories: Number(analysis.calories) || 0,
        protein: Number(analysis.protein) || 0,
        carbs: Number(analysis.carbs) || 0,
        fat: Number(analysis.fat) || 0,
        fiber: Number(analysis.fiber) || 0,
        sugar: Number(analysis.sugar) || 0,
        confidence: Number(analysis.confidence) || 0.5,
        ingredients: Array.isArray(analysis.ingredients)
          ? analysis.ingredients
          : ["Unknown"],
        mealType: analysis.mealType || "Unknown",
        portionEstimate: analysis.portionEstimate || "1 portion",
        healthScore: Number(analysis.healthScore) || 50,
        warnings: Array.isArray(analysis.warnings) ? analysis.warnings : [],
      };

      return validatedAnalysis;
    } catch (error) {
      // Log the error and response
      console.error("Failed to parse OpenAI response as JSON:", content);

      // Generate a fallback response
      const fallbackAnalysis: FoodAnalysis = {
        foodName: "Food item (analysis failed)",
        servingSize: "1 serving",
        calories: 300,
        protein: 15,
        carbs: 30,
        fat: 10,
        fiber: 5,
        sugar: 8,
        confidence: 0.5,
        ingredients: ["Could not analyze ingredients"],
        mealType: "Unknown",
        portionEstimate: "Standard portion",
        healthScore: 50,
        warnings: ["AI analysis failed, using estimated values"],
      };

      return fallbackAnalysis;
    }
  } catch (error) {
    console.error("Error analyzing photo with OpenAI:", error);
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
        carbsPercentage: Math.round(((analysis.carbs * 4) / totalMacros) * 100),
        fatPercentage: Math.round(((analysis.fat * 9) / totalMacros) * 100),
      };

      // Save analysis results to Firestore
      const date = new Date().toISOString().split("T")[0];
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
  const dailyTotalsRef = db
    .collection("users")
    .doc(userId)
    .collection("dailyTotals")
    .doc(date);

  await db.runTransaction(async (transaction) => {
    const doc = await transaction.get(dailyTotalsRef);
    const currentTotals: DailyTotals = doc.exists
      ? (doc.data() as DailyTotals)
      : {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          meals: 0,
        };

    const newTotals: DailyTotals = {
      calories: currentTotals.calories + meal.calories,
      protein: currentTotals.protein + meal.protein,
      carbs: currentTotals.carbs + meal.carbs,
      fat: currentTotals.fat + meal.fat,
      fiber: currentTotals.fiber + meal.fiber,
      sugar: currentTotals.sugar + meal.sugar,
      meals: currentTotals.meals + 1,
      lastUpdated: new Date().toISOString(),
    };

    transaction.set(dailyTotalsRef, newTotals);
  });
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
    // Handle CORS
    return corsHandler(req, res, async () => {
      try {
        if (req.method !== "POST") {
          res.status(405).send("Method not allowed");
          return;
        }

        const { userId, date, mealId, userInput } = req.body;

        if (!userId || !date || !mealId || !userInput) {
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
