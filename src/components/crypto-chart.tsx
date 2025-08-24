
"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType } from "lightweight-charts";
import type { IChartApi, ISeriesApi, CandlestickData, Time, LineData, PriceScaleApi } from "lightweight-charts";
import { fetchKlines } from "@/lib/binance";
import type { CandleData, Indicator } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { RSI } from 'technicalindicators';


interface CryptoChartProps {
  tradingPair: string;
  interval: string;
  onDataLoaded: (data: CandleData[]) => void;
  indicators: Indicator[];
}

export function CryptoChart({ tradingPair, interval, onDataLoaded, indicators }: CryptoChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<CandleData[]>([]);
  
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
  
  // Handle indicators
  useEffect(() => {
    if (!chartRef.current || historicalData.length === 0) return;

    const rsiPriceScale = chartRef.current.priceScale('rsi');

    // Handle RSI
    if (indicators.includes("RSI") && !rsiSeriesRef.current) {
      rsiSeriesRef.current = chartRef.current.addLineSeries({
        color: '#FFD700',
        lineWidth: 2,
        priceScaleId: 'rsi',
        priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
        },
      });
       rsiPriceScale.applyOptions({
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
        visible: true,
      });
      
      if (historicalData.length >= 14) {
        const rsi = RSI.calculate({
          values: historicalData.map(d => d.close),
          period: 14
        });
        
        const rsiData: LineData<Time>[] = rsi.map((value, index) => ({
          time: historicalData[index + 14 -1].time as Time,
          value,
        }));
        rsiSeriesRef.current.setData(rsiData);
      }

    } else if (!indicators.includes("RSI") && rsiSeriesRef.current) {
      chartRef.current.removeSeries(rsiSeriesRef.current);
      rsiSeriesRef.current = null;
      rsiPriceScale.applyOptions({ visible: false });
    }

  }, [indicators, historicalData]);


  // Fetch historical data and set up WebSocket
  useEffect(() => {
    let isMounted = true;
    let ws: WebSocket | null = null;
    
    async function setupChart() {
      if (!candlestickSeriesRef.current || !chartRef.current) return;
      
      setLoading(true);

      // Reset indicator series when pair or interval changes
      if (rsiSeriesRef.current) {
        chartRef.current.removeSeries(rsiSeriesRef.current);
        rsiSeriesRef.current = null;
        chartRef.current.priceScale('rsi').applyOptions({ visible: false });
      }

      const data = await fetchKlines(tradingPair, interval, 200);
      
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
        setHistoricalData(data);
        onDataLoaded(data);
        setLoading(false);
      }
      
      // Connect to WebSocket
      const symbol = tradingPair.toLowerCase();
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@kline_${interval}`);
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const kline = message.k;
        const candle: CandlestickData<Time> = {
          time: (kline.t / 1000) as Time,
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
  }, [tradingPair, interval, onDataLoaded]);
  
  return (
    <div className="relative w-full h-full">
      {loading && <Skeleton className="absolute inset-0" />}
      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
