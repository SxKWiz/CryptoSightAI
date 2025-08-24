import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
  where,
} from "firebase/firestore";
import type { AnalysisHistoryRecord, SignUpData, LoginData } from "@/types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const historyCollection = collection(db, "analysisHistory");

// Auth functions
export const signUpUser = (data: SignUpData) => {
  return createUserWithEmailAndPassword(auth, data.email, data.password);
};

export const signInUser = (data: LoginData) => {
  return signInWithEmailAndPassword(auth, data.email, data.password);
};

export const signOutUser = () => {
  return signOut(auth);
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};


/**
 * Adds a new analysis record to the Firestore database.
 * @param record The analysis record to add.
 */
export async function addAnalysisHistory(record: Omit<AnalysisHistoryRecord, 'id'>): Promise<void> {
  try {
    if (!record.userId) {
      throw new Error("User ID is required to save analysis history.");
    }
    await addDoc(historyCollection, {
      ...record,
      createdAt: Timestamp.fromDate(record.createdAt),
    });
  } catch (error) {
    console.error("Error adding document to Firestore: ", error);
    throw new Error("Failed to save analysis history.");
  }
}

/**
 * Retrieves all analysis history records from Firestore for a specific user, ordered by creation date.
 * @param userId The ID of the user whose history to retrieve.
 * @returns A promise that resolves to an array of analysis history records.
 */
export async function getAnalysisHistory(userId: string): Promise<AnalysisHistoryRecord[]> {
  try {
    if (!userId) return [];
    
    const q = query(
      historyCollection, 
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        tradingPair: data.tradingPair,
        analysisSummary: data.analysisSummary,
        tradeSignal: data.tradeSignal,
        riskLevel: data.riskLevel,
        confidenceLevel: data.confidenceLevel,
        createdAt: (data.createdAt as Timestamp).toDate(),
      } as AnalysisHistoryRecord;
    });
  } catch (error) {
    console.error("Error getting documents from Firestore: ", error);
    throw new Error("Failed to fetch analysis history.");
  }
}
