"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, CandlestickData, Time } from "lightweight-charts";
import { fetchKlines } from "@/lib/binance";
import type { CandleData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";

interface CryptoChartProps {
  tradingPair: string;
  onDataLoaded: (data: CandleData[]) => void;
}

export function CryptoChart({ tradingPair, onDataLoaded }: CryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize chart
  useEffect(() => {
    const initChart = () => {
      if (!chartContainerRef.current) return;
      
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "#D1D5DB",
        },
        grid: {
          vertLines: { color: "rgba(70, 70, 70, 0.5)" },
          horzLines: { color: "rgba(70, 70, 70, 0.5)" },
        },
        timeScale: {
          borderColor: "#4B5563",
        },
        rightPriceScale: {
          borderColor: "#4B5563",
        },
      });

      candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderDownColor: "#ef4444",
        borderUpColor: "#22c55e",
        wickDownColor: "#ef4444",
        wickUpColor: "#22c55e",
      });
    };

    initChart();

    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.resize(
          chartContainerRef.current.clientWidth,
          chartContainerRef.current.clientHeight
        );
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);

  // Fetch historical data and set up WebSocket
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    
    async function setupChart() {
      if (!candlestickSeriesRef.current) return;
      
      setLoading(true);
      const data = await fetchKlines(tradingPair, "1d", 200);
      
      if (isMounted) {
        if (candlestickSeriesRef.current) {
          const formattedData: CandlestickData<Time>[] = data.map((d) => ({
            time: d.time as Time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }));
          candlestickSeriesRef.current.setData(formattedData);
        }
        onDataLoaded(data);
        setLoading(false);
      }
      
      // Connect to WebSocket
      const symbol = tradingPair.toLowerCase();
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_1d`);
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const kline = message.k;
        const candle: CandlestickData<Time> = {
          time: kline.t / 1000 as Time,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
        };
        
        if (isMounted && candlestickSeriesRef.current) {
          candlestickSeriesRef.current.update(candle);
        }
      };
      
      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };
    }
    
    setupChart();
    
    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
      }
    };
  }, [tradingPair, onDataLoaded]);
  
  return (
    <div className="relative w-full h-full">
      {loading && <Skeleton className="absolute inset-0" />}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
