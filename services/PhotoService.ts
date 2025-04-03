import { storage, db } from "../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";

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
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `${userId}/${timestamp}.jpg`;

      // Fetch the file and convert to blob
      const response = await fetch(photoUri);
      if (!response.ok) {
        throw new Error("Failed to fetch photo");
      }

      const blob = await response.blob();

      // Upload the photo to Firebase Storage
      const storageRef = ref(storage, filename);
      const metadata = {
        contentType: "image/jpeg",
      };
      await uploadBytes(storageRef, blob, metadata);

      // Get the download URL
      const url = await getDownloadURL(storageRef);

      // Create metadata object
      const photoMetadata: PhotoMetadata = {
        url,
        timestamp,
        mealType,
      };

      // Store metadata in Firestore
      const date = new Date().toISOString().split("T")[0];
      await addDoc(
        collection(db, "users", userId, "logs", date, "meals"),
        photoMetadata
      );

      return photoMetadata;
    } catch (error) {
      console.error("Error uploading photo:", error);
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
