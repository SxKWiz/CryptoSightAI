import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import type { AnalysisHistoryRecord } from "@/types";

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
const db = getFirestore(app);

const historyCollection = collection(db, "analysisHistory");

/**
 * Adds a new analysis record to the Firestore database.
 * @param record The analysis record to add.
 */
export async function addAnalysisHistory(record: Omit<AnalysisHistoryRecord, 'id'>): Promise<void> {
  try {
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
 * Retrieves all analysis history records from Firestore, ordered by creation date.
 * @returns A promise that resolves to an array of analysis history records.
 */
export async function getAnalysisHistory(): Promise<AnalysisHistoryRecord[]> {
  try {
    const q = query(historyCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tradingPair: data.tradingPair,
        analysisSummary: data.analysisSummary,
        tradeSignal: data.tradeSignal,
        createdAt: (data.createdAt as Timestamp).toDate(),
      } as AnalysisHistoryRecord;
    });
  } catch (error) {
    console.error("Error getting documents from Firestore: ", error);
    throw new Error("Failed to fetch analysis history.");
  }
}
