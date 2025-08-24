"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getAnalysisHistory } from "@/lib/firebase";
import { summarizeAnalysisHistory } from "@/ai/flows/summarize-analysis-history";
import type { AnalysisHistoryRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function HistoryPage() {
  const [history, setHistory] = useState<AnalysisHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; keyInsights: string } | null>(null);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchHistory() {
      try {
        const historyData = await getAnalysisHistory();
        setHistory(historyData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch analysis history.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, [toast]);
  
  const handleSummarize = async () => {
    if (history.length === 0) {
      toast({
        title: "Not enough data",
        description: "There is no analysis history to summarize.",
      });
      return;
    }
    
    setIsSummarizing(true);
    try {
      const historyString = history
        .map(
          (h) => `Date: ${h.createdAt.toISOString()}, Pair: ${h.tradingPair}, Summary: ${h.analysisSummary}`
        )
        .join("\n---\n");
        
      const result = await summarizeAnalysisHistory({ analysisHistory: historyString });
      setSummary(result);
      setIsSummaryDialogOpen(true);
    } catch (error) {
      console.error("Summarization failed:", error);
      toast({
        title: "Summarization Failed",
        description: "Could not generate history summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSummarizing(false);
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4 mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Analysis History</h1>
          <p className="text-muted-foreground">
            Review your past AI-powered chart analyses.
          </p>
        </div>
        <Button onClick={handleSummarize} disabled={isSummarizing || history.length === 0}>
           {isSummarizing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
          Summarize History
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : history.length === 0 ? (
        <Card className="text-center py-12">
           <CardHeader>
            <CardTitle>No History Found</CardTitle>
            <CardDescription>
              Your analysis history is empty. Go to the home page to analyze a chart.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="w-full space-y-2">
          {history.map((record) => (
            <AccordionItem value={record.id!} key={record.id} className="border-b-0">
              <Card>
                <AccordionTrigger className="p-6 text-left hover:no-underline">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{record.tradingPair}</Badge>
                      <p className="font-medium truncate max-w-xs md:max-w-md">{record.analysisSummary}</p>
                    </div>
                    <p className="text-sm text-muted-foreground hidden md:block">
                      {format(record.createdAt, "PPP p")}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-6 pt-0">
                  <div className="space-y-4">
                    <p><span className="font-semibold">Entry:</span> {record.tradeSignal.entryPriceRange}</p>
                    <p><span className="font-semibold">Take Profit:</span> {record.tradeSignal.takeProfitLevels.join(', ')}</p>
                    <p><span className="font-semibold">Stop Loss:</span> {record.tradeSignal.stopLoss}</p>
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">History Summary & Insights</DialogTitle>
            <DialogDescription>
              An AI-generated overview of your trading analysis patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6 max-h-[60vh] overflow-y-auto pr-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Summary</h3>
              <p className="text-muted-foreground">{summary?.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Key Insights</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{summary?.keyInsights}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
