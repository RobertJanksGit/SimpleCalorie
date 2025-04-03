import { storage, db } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore";

export interface PhotoMetadata {
  url: string;
  timestamp: number;
  mealType: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export class PhotoService {
  private static instance: PhotoService;

  private constructor() {}

  static getInstance(): PhotoService {
    if (!PhotoService.instance) {
      PhotoService.instance = new PhotoService();
    }
    return PhotoService.instance;
  }

  async uploadPhoto(
    photoUri: string,
    userId: string,
    mealType: string
  ): Promise<PhotoMetadata> {
    try {
      console.log("Starting photo upload process...", {
        userId,
        mealType,
      });

      // Check if user document exists
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log("User document does not exist, creating it...");
        await setDoc(userDocRef, {
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        });
      }

      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}.jpg`;
      console.log("Generated filename:", filename);

      // Fetch the file and convert to blob
      console.log("Fetching photo from URI...");
      const response = await fetch(photoUri);
      if (!response.ok) {
        throw new Error("Failed to fetch photo");
      }

      const blob = await response.blob();
      console.log("Photo fetched successfully, size:", blob.size);

      // Upload the photo to Firebase Storage
      console.log("Creating storage reference...");
      const storageRef = ref(storage, filename);
      const metadata = {
        contentType: "image/jpeg",
      };
      console.log("Uploading to Firebase Storage...");
      await uploadBytes(storageRef, blob, metadata);
      console.log("Upload successful, getting download URL...");

      // Get the download URL
      const url = await getDownloadURL(storageRef);
      console.log("Download URL obtained:", url);

      // Create metadata object
      const photoMetadata: PhotoMetadata = {
        url,
        timestamp,
        mealType,
      };

      // Store metadata in Firestore
      const date = new Date().toISOString().split("T")[0];
      console.log("Storing metadata in Firestore...", {
        userId,
        date,
        collectionPath: `users/${userId}/logs/${date}/meals`,
      });
      await addDoc(
        collection(db, "users", userId, "logs", date, "meals"),
        photoMetadata
      );
      console.log("Metadata stored successfully");

      return photoMetadata;
    } catch (error) {
      console.error("Error uploading photo:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      throw new Error("Failed to upload photo");
    }
  }

  async retryUpload(
    photoUri: string,
    userId: string,
    mealType: string,
    maxRetries: number = 3
  ): Promise<PhotoMetadata> {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await this.uploadPhoto(photoUri, userId, mealType);
      } catch (error) {
        lastError = error;
        // Wait for 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw lastError;
  }
}
