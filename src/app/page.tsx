"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Loader2, Zap, Settings2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Indicator } from "@/types";


const tradingPairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
const intervals = ["1d", "4h", "1h"];

export default function Home() {
  const { user } = useAuth();
  const [tradingPair, setTradingPair] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1d");
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>([]);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleAnalyze = useCallback(async (isAutoRefresh = false) => {
    if (!user) {
       if (!isAutoRefresh) {
         toast({
          title: "Authentication Required",
          description: "Please log in to analyze charts.",
          variant: "destructive",
        });
       }
      return;
    }
    if (chartData.length === 0) {
      if (!isAutoRefresh) {
        toast({
          title: "Error",
          description: "Chart data is not loaded yet. Please wait.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!isAutoRefresh) {
      setIsLoading(true);
      setAnalysisResult(null);
    }

    try {
      const result = await analyzeCryptoChart({
        chartData: JSON.stringify(chartData.slice(-100)), // Use last 100 candles for analysis
        tradingPair,
      });
      setAnalysisResult(result);

       if (!isAutoRefresh && user) {
        await addAnalysisHistory({
          userId: user.uid,
          tradingPair,
          analysisSummary: result.analysisSummary,
          tradeSignal: result.tradeSignal,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      if (!isAutoRefresh) {
        toast({
          title: "Analysis Failed",
          description: "Could not analyze the chart data. Please try again.",
          variant: "destructive",
        });
      }
       // Stop auto-refresh on error
      setIsAutoRefreshing(false);
    } finally {
      if (!isAutoRefresh) {
        setIsLoading(false);
      }
    }
  }, [user, chartData, tradingPair, toast]);
  
  
   useEffect(() => {
    // Clear interval on component unmount, or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (isAutoRefreshing && analysisResult) {
      intervalRef.current = setInterval(() => {
        handleAnalyze(true);
      }, 60000); // 1 minute
    }
     // Cleanup on tradingPair change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRefreshing, analysisResult, handleAnalyze]);
  
   const handleTradingPairChange = (pair: string) => {
    setTradingPair(pair);
    setAnalysisResult(null);
    setIsAutoRefreshing(false); // Turn off auto-refresh when pair changes
  };

  const handleIntervalChange = (value: string) => {
    if (value) {
      setInterval(value);
      setAnalysisResult(null);
      setIsAutoRefreshing(false);
    }
  };
  
  const handleIndicatorToggle = (indicator: Indicator) => {
    setActiveIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
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
          <div className="flex items-center space-x-2">
            <Switch 
              id="auto-refresh-switch" 
              checked={isAutoRefreshing}
              onCheckedChange={setIsAutoRefreshing}
              disabled={!analysisResult}
            />
            <Label htmlFor="auto-refresh-switch">Auto-Refresh Analysis</Label>
          </div>
          <Select value={tradingPair} onValueChange={handleTradingPairChange}>
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
          <Button onClick={() => handleAnalyze(false)} disabled={isLoading} className="min-w-[120px]">
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
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
           <ToggleGroup type="single" value={interval} onValueChange={handleIntervalChange} aria-label="Chart Interval">
            {intervals.map((item) => (
              <ToggleGroupItem key={item} value={item} aria-label={`Select ${item}`}>
                {item.toUpperCase()}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="mr-2 h-4 w-4" />
                Indicators
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Technical Indicators</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={activeIndicators.includes("RSI")}
                onCheckedChange={() => handleIndicatorToggle("RSI")}
              >
                RSI
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] lg:h-[600px] w-full">
            <CryptoChart
              tradingPair={tradingPair}
              interval={interval}
              onDataLoaded={setChartData}
              indicators={activeIndicators}
            />
          </div>
        </CardContent>
      </Card>

       {!user && (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Welcome to CryptoSight AI</CardTitle>
              <CardDescription>
                Please log in or sign up to save and review your analysis history.
              </CardDescription>
            </CardHeader>
            <CardContent>
                <Link href="/login" passHref>
                  <Button>Login</Button>
                </Link>
            </CardContent>
          </Card>
      )}
      
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
