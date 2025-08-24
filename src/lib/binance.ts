import type { CandleData } from "@/types";

const API_BASE_URL = "https://api.binance.com/api/v3";

/**
 * Fetches k-line (candlestick) data from Binance.
 * @param symbol The trading pair symbol (e.g., 'BTCUSDT').
 * @param interval The interval of candlesticks (e.g., '1h', '4h', '1d').
 * @param limit The number of candlesticks to retrieve.
 * @returns A promise that resolves to an array of CandleData.
 */
export async function fetchKlines(
  symbol: string = "BTCUSDT",
  interval: string = "1d",
  limit: number = 200
): Promise<CandleData[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    if (!response.ok) {
      throw new Error(`Error fetching data: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Binance API returns an array of arrays.
    // [0: open time, 1: open, 2: high, 3: low, 4: close, 5: volume, ...]
    return data.map((d: any) => ({
      time: d[0] / 1000, // Convert from ms to seconds for lightweight-charts
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
    }));
  } catch (error) {
    console.error("Failed to fetch k-line data from Binance:", error);
    return [];
  }
}
