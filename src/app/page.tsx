"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CryptoChart } from "@/components/crypto-chart";
import { AnalysisResultCard } from "@/components/analysis-result-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CandleData, AnalysisResult } from "@/types";
import { analyzeCryptoChart } from "@/ai/flows/analyze-crypto-chart";
import { addAnalysisHistory } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap } from "lucide-react";

const tradingPairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];

export default function Home() {
  const [tradingPair, setTradingPair] = useState("BTCUSDT");
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (chartData.length === 0) {
      toast({
        title: "Error",
        description: "Chart data is not loaded yet. Please wait.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setAnalysisResult(null);
    try {
      const result = await analyzeCryptoChart({
        chartData: JSON.stringify(chartData.slice(-100)), // Use last 100 candles for analysis
        tradingPair,
      });
      setAnalysisResult(result);
      await addAnalysisHistory({
        tradingPair,
        analysisSummary: result.analysisSummary,
        tradeSignal: result.tradeSignal,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error("Analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the chart data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            AI Chart Analysis
          </h1>
          <p className="text-muted-foreground">
            Select a trading pair and let Gemini analyze the chart for you.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={tradingPair} onValueChange={setTradingPair}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select pair" />
            </SelectTrigger>
            <SelectContent>
              {tradingPairs.map((pair) => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAnalyze} disabled={isLoading} className="min-w-[120px]">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            Analyze
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="h-[400px] lg:h-[600px] w-full">
            <CryptoChart
              tradingPair={tradingPair}
              onDataLoaded={setChartData}
            />
          </div>
        </CardContent>
      </Card>
      
      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      )}

      {analysisResult && <AnalysisResultCard result={analysisResult} />}
    </div>
  );
}
