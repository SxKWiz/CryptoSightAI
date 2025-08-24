
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
import type { CandleData, AnalysisResult, Indicator, PriceAlert } from "@/types";
import { analyzeCryptoChart } from "@/ai/flows/analyze-crypto-chart";
import { addAnalysisHistory } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Zap, Settings2, Bell, AlertTriangle, CheckCircle2, ArrowDownRight } from "lucide-react";
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
import { format } from "date-fns";


const tradingPairs = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", 
  "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "DOTUSDT", "MATICUSDT",
  "SHIBUSDT", "TRXUSDT", "LTCUSDT", "LINKUSDT", "UNIUSDT",
  "ATOMUSDT", "ETCUSDT", "BCHUSDT", "XLMUSDT", "NEARUSDT"
];
const intervals = ["1d", "4h", "1h"];
const tradingStyles = ["Day Trading", "Swing Trading", "Position Trading"];
const riskTolerances = ["Conservative", "Moderate", "Aggressive"];

export default function Home() {
  const { user } = useAuth();
  const [tradingPair, setTradingPair] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1d");
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Indicator[]>([]);
  const [latestPrice, setLatestPrice] = useState<number | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [entryPriceHit, setEntryPriceHit] = useState(false);
  const [tradingStyle, setTradingStyle] = useState(tradingStyles[1]);
  const [riskTolerance, setRiskTolerance] = useState(riskTolerances[1]);
  const alertedLevels = useRef(new Set<string>());

  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleAnalyze = useCallback(async (isAutoRefresh = false) => {
    // Prevent multiple simultaneous analyses
    if (isLoading && !isAutoRefresh) {
      return;
    }

    if (!isAutoRefresh) {
      setIsLoading(true);
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set a safety timeout
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        console.warn("Analysis timeout - resetting loading state");
      }, 30000); // 30 seconds timeout
    }

    try {
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
        setAnalysisResult(null);
        setPriceAlerts([]);
        setEntryPriceHit(false);
        alertedLevels.current.clear();
      }

      const result = await analyzeCryptoChart({
        chartData: JSON.stringify(chartData.slice(-100)),
        tradingPair,
        tradingStyle,
        riskTolerance,
      });
      setAnalysisResult(result);

      if (!isAutoRefresh && user) {
        await addAnalysisHistory({
          userId: user.uid,
          tradingPair,
          analysisSummary: result.analysisSummary,
          tradeSignal: result.tradeSignal,
          riskLevel: result.riskLevel,
          confidenceLevel: result.confidenceLevel,
          createdAt: new Date(),
          tradingStyle,
          riskTolerance,
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
      setIsAutoRefreshing(false);
    } finally {
      if (!isAutoRefresh) {
        // Clear the timeout since we're done
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setIsLoading(false);
      }
    }
  }, [user, chartData, tradingPair, toast, tradingStyle, riskTolerance, isLoading]);
  
   useEffect(() => {
    // Clear interval on component unmount, or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Reset loading state on cleanup
      setIsLoading(false);
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
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Reset loading state when dependencies change
      setIsLoading(false);
    };
  }, [isAutoRefreshing, analysisResult, handleAnalyze]);
  
  // Effect to check for price alerts
  useEffect(() => {
    if (!latestPrice || !analysisResult) return;

    const { tradeSignal } = analysisResult;
    const { entryPriceRange, takeProfitLevels, stopLoss } = tradeSignal;
    const lastPrice = latestPrice;

    // 1. Check for entry price hit if not already hit
    if (!entryPriceHit) {
      const entryPrices = entryPriceRange.split('-').map(p => parseFloat(p.trim()));
      const [entryStart, entryEnd] = entryPrices.length > 1 ? [Math.min(...entryPrices), Math.max(...entryPrices)] : [entryPrices[0], entryPrices[0]];

      if (lastPrice >= entryStart && lastPrice <= entryEnd && !alertedLevels.current.has('entry')) {
        setEntryPriceHit(true);
        const newAlert: PriceAlert = {
          level: entryPriceRange,
          type: "entry",
          price: lastPrice,
          timestamp: new Date(),
        };
        setPriceAlerts(prev => [...prev, newAlert]);
        alertedLevels.current.add('entry');
        toast({
          title: "Entry Price Hit!",
          description: `Price entered the range ${entryPriceRange} at ${lastPrice.toFixed(2)}.`,
        });
      }
    }

    // 2. If entry price is hit, check for take profit and stop loss
    if (entryPriceHit) {
      const numericStopLoss = parseFloat(stopLoss.replace(/[^0-9.-]+/g, ""));
      
      // Check Stop Loss
      if (lastPrice <= numericStopLoss && !alertedLevels.current.has(`sl-${stopLoss}`)) {
        const newAlert: PriceAlert = {
          level: stopLoss,
          type: "stopLoss",
          price: lastPrice,
          timestamp: new Date(),
        };
        setPriceAlerts(prev => [...prev, newAlert]);
        alertedLevels.current.add(`sl-${stopLoss}`);
        toast({
          title: "Stop Loss Hit",
          description: `Price reached the stop loss level of ${stopLoss} at ${lastPrice.toFixed(2)}.`,
          variant: "destructive",
        });
      }

      // Check Take Profit Levels
      takeProfitLevels.forEach(level => {
        const numericLevel = parseFloat(level.replace(/[^0-9.-]+/g, ""));
        if (lastPrice >= numericLevel && !alertedLevels.current.has(`tp-${level}`)) {
           const newAlert: PriceAlert = {
            level: level,
            type: "takeProfit",
            price: lastPrice,
            timestamp: new Date(),
          };
          setPriceAlerts(prev => [...prev, newAlert]);
          alertedLevels.current.add(`tp-${level}`);
          toast({
            title: "Take Profit Hit!",
            description: `Price reached the take profit level of ${level} at ${lastPrice.toFixed(2)}.`,
          });
        }
      });
    }

  }, [latestPrice, analysisResult, entryPriceHit, toast]);
  
   const handleTradingPairChange = (pair: string) => {
    setTradingPair(pair);
    setAnalysisResult(null);
    setIsAutoRefreshing(false); // Turn off auto-refresh when pair changes
    setPriceAlerts([]);
    setEntryPriceHit(false);
    alertedLevels.current.clear();
  };

  const handleIntervalChange = (value: string) => {
    if (value) {
      setInterval(value);
      setAnalysisResult(null);
      setIsAutoRefreshing(false);
      setPriceAlerts([]);
      setEntryPriceHit(false);
      alertedLevels.current.clear();
    }
  };
  
  const handleIndicatorToggle = (indicator: Indicator) => {
    setActiveIndicators(prev => 
      prev.includes(indicator) 
        ? prev.filter(i => i !== indicator)
        : [...prev, indicator]
    );
  };
  
  const getAlertIcon = (type: PriceAlert['type']) => {
    switch(type) {
      case 'entry':
        return <ArrowDownRight className="h-5 w-5 text-blue-500 mt-0.5" />;
      case 'takeProfit':
        return <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />;
      case 'stopLoss':
        return <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />;
      default:
        return null;
    }
  }
  
  const getAlertTitle = (type: PriceAlert['type']) => {
    switch(type) {
      case 'entry':
        return 'Entry Price Hit';
      case 'takeProfit':
        return 'Take Profit Hit';
      case 'stopLoss':
        return 'Stop Loss Hit';
      default:
        return '';
    }
  }


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
        <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-4 border-b">
           <div className="flex items-center gap-4">
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
           </div>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="trading-style" className="text-sm">Style</Label>
                <Select value={tradingStyle} onValueChange={setTradingStyle}>
                  <SelectTrigger id="trading-style" className="w-[160px]">
                    <SelectValue placeholder="Style" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradingStyles.map((style) => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="risk-tolerance" className="text-sm">Risk</Label>
                <Select value={riskTolerance} onValueChange={setRiskTolerance}>
                  <SelectTrigger id="risk-tolerance" className="w-[140px]">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskTolerances.map((risk) => (
                      <SelectItem key={risk} value={risk}>{risk}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[400px] lg:h-[600px] w-full">
            <CryptoChart
              tradingPair={tradingPair}
              interval={interval}
              onDataLoaded={setChartData}
              indicators={activeIndicators}
              onPriceUpdate={setLatestPrice}
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
      
      {analysisResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Price alerts based on the current trade signal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 mb-4">
              <Switch 
                id="auto-refresh-switch" 
                checked={isAutoRefreshing}
                onCheckedChange={setIsAutoRefreshing}
                disabled={!analysisResult}
              />
              <Label htmlFor="auto-refresh-switch">Auto-Refresh Analysis & Alerts</Label>
            </div>
            {priceAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {analysisResult ? 'Watching for entry price...' : 'No price alerts yet.'}
              </p>
            ) : (
              <ul className="space-y-3">
                {priceAlerts.map((alert, index) => (
                  <li key={index} className="flex items-start space-x-3 text-sm">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <p className="font-medium">
                        {getAlertTitle(alert.type)}: <span className="font-bold">{alert.level}</span>
                      </p>
                      <p className="text-muted-foreground">
                        Price reached {alert.price.toFixed(2)} at {format(alert.timestamp, "PPP p")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
