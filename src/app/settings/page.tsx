"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [binanceKey, setBinanceKey] = useState("");
  const [binanceSecret, setBinanceSecret] = useState("");
  const [defaultPair, setDefaultPair] = useState("BTCUSDT");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if(user) {
      const savedKey = localStorage.getItem("binanceApiKey");
      const savedSecret = localStorage.getItem("binanceApiSecret");
      const savedPair = localStorage.getItem("defaultTradingPair");

      if (savedKey) setBinanceKey(savedKey);
      if (savedSecret) setBinanceSecret(savedSecret);
      if (savedPair) setDefaultPair(savedPair);
      setIsLoading(false);
    }
  }, [user]);

  const handleSaveChanges = () => {
    setIsSaving(true);
    localStorage.setItem("binanceApiKey", binanceKey);
    localStorage.setItem("binanceApiSecret", binanceSecret);
    localStorage.setItem("defaultTradingPair", defaultPair);

    setTimeout(() => {
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
      setIsSaving(false);
    }, 500);
  };
  
  if (authLoading || isLoading || !user) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-2/3" />
          <div className="mt-6 space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
      <div className="space-y-1 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application settings and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Enter your API keys for third-party services. These are stored locally in your browser and not shared.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="binance-key">Binance API Key</Label>
            <Input 
              id="binance-key" 
              placeholder="Your Binance API Key" 
              type="password"
              value={binanceKey}
              onChange={(e) => setBinanceKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="binance-secret">Binance API Secret</Label>
            <Input 
              id="binance-secret" 
              placeholder="Your Binance API Secret" 
              type="password" 
              value={binanceSecret}
              onChange={(e) => setBinanceSecret(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize the application to your liking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="default-pair">Default Trading Pair</Label>
            <Input 
              id="default-pair" 
              value={defaultPair}
              onChange={(e) => setDefaultPair(e.target.value.toUpperCase())}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
