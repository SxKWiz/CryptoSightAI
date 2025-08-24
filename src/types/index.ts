import type { Time } from 'lightweight-charts';
import type { FirebaseFirestore } from 'firebase/firestore';

export interface CandleData {
  time: Time | number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface TradeSignal {
  entryPriceRange: string;
  takeProfitLevels: string[];
  stopLoss: string;
}

export interface AnalysisResult {
  analysisSummary: string;
  tradeSignal: TradeSignal;
}

export interface AnalysisHistoryRecord {
  id?: string;
  tradingPair: string;
  analysisSummary: string;
  tradeSignal: TradeSignal;
  createdAt: Date;
}
