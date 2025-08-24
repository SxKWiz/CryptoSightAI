import type { Time } from 'lightweight-charts';
import type { z } from 'zod';
import type { signUpSchema, loginSchema } from '@/lib/validation';

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
  userId: string;
  tradingPair: string;
  analysisSummary: string;
  tradeSignal: TradeSignal;
  createdAt: Date;
}

export type SignUpData = z.infer<typeof signUpSchema>;
export type LoginData = z.infer<typeof loginSchema>;
