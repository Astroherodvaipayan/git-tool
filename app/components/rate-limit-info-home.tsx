"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Info, Clock } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";

interface RateLimit {
  limit: number;
  remaining: number;
  reset: number;
  isAuthenticated: boolean;
  error?: string;
}

export function RateLimitInfoHome() {
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeUntilResetString, setTimeUntilResetString] = useState<string>("");
  const [resetTimeString, setResetTimeString] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    async function fetchRateLimit() {
      try {
        const response = await fetch('/api/rate-limit');
        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setRateLimit(data);
      } catch (error) {
        console.error('Error fetching rate limit:', error);
        // Fallback values
        setRateLimit({
          limit: window.GITHUB_AUTH_AVAILABLE === 'true' ? 5000 : 60,
          remaining: window.GITHUB_AUTH_AVAILABLE === 'true' ? 4900 : 50, // Assume we have most of our quota left
          reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          isAuthenticated: window.GITHUB_AUTH_AVAILABLE === 'true',
          error: error instanceof Error ? error.message : 'Failed to fetch rate limit information'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchRateLimit();
    setIsMounted(true);
  }, []);

  // Effect for updating time-based values
  useEffect(() => {
    if (!rateLimit) return;
    
    const resetDate = new Date(rateLimit.reset * 1000);
    
    // Format the reset time in a consistent format
    const formatResetTime = () => {
      const hours = resetDate.getHours();
      const minutes = resetDate.getMinutes();
      const seconds = resetDate.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12; // Convert 0 to 12 for 12-hour format
      
      const formattedTime = `${formattedHours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
      setResetTimeString(formattedTime);
    };
    
    const updateTimeUntilReset = () => {
      const now = new Date();
      const secondsUntilReset = Math.max(0, Math.floor((resetDate.getTime() - now.getTime()) / 1000));
      const minutesUntilReset = Math.floor(secondsUntilReset / 60);
      const hoursUntilReset = Math.floor(minutesUntilReset / 60);
      
      const newTimeUntilResetString = hoursUntilReset > 0 
        ? `${hoursUntilReset}h ${minutesUntilReset % 60}m` 
        : `${minutesUntilReset}m ${secondsUntilReset % 60}s`;
      
      setTimeUntilResetString(newTimeUntilResetString);
    };
    
    // Initial calculation
    formatResetTime();
    updateTimeUntilReset();
    
    // Update every second
    const intervalId = setInterval(updateTimeUntilReset, 1000);
    
    // Clean up interval
    return () => clearInterval(intervalId);
  }, [rateLimit]);

  if (loading) {
    return (
      <Card className="border-muted">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Loading GitHub API rate limit information...</p>
        </CardContent>
      </Card>
    );
  }

  if (!rateLimit) {
    return null;
  }

  // Calculate reset time in a human-readable format
  const resetDate = new Date(rateLimit.reset * 1000);
  
  // Calculate percentage of rate limit used
  const percentUsed = Math.round(((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100);
  const isLow = rateLimit.remaining < 10 || percentUsed > 90;
  const isMedium = !isLow && rateLimit.remaining < Math.ceil(rateLimit.limit * 0.25); // Below 25%
  
  // Get card border color based on status
  const getBorderClass = () => {
    if (isLow) return "border-destructive";
    if (isMedium) return "border-amber-400 dark:border-amber-600";
    return "border-muted";
  };
  
  // Get progress bar color based on status
  const getProgressBarClass = () => {
    if (isLow) return "bg-destructive";
    if (isMedium) return "bg-amber-400";
    return "bg-primary";
  };
  
  return (
    <Card className={getBorderClass()}>
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          {isLow ? (
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          ) : isMedium ? (
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
          
          <div className="w-full">
            <div className="flex justify-between items-center">
              <p className={`text-sm font-medium ${isLow ? "text-destructive" : isMedium ? "text-amber-600" : ""}`}>
                GitHub API Rate Limit: {rateLimit.remaining} / {rateLimit.limit} requests remaining
              </p>
              <p className="text-xs text-muted-foreground">
                Resets in: {isMounted ? timeUntilResetString : "calculating..."}
              </p>
            </div>
            
            <div className="mt-1 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getProgressBarClass()}`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            
            <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <p>
                {rateLimit.isAuthenticated ? (
                  <>Using authenticated requests (5,000/hour limit). </>
                ) : (
                  <>Using unauthenticated requests (60/hour limit). For higher limits, add a GITHUB_TOKEN in server environment. </>
                )}
              </p>
              <p>
                Resets at: {isMounted ? resetTimeString : "calculating..."}
              </p>
            </div>
            
            {isLow && (
              <div className="mt-2 text-xs text-destructive">
                <p className="font-medium">Warning: Rate limit nearly exhausted</p>
                <p>Some features may be unavailable until the limit resets.</p>
              </div>
            )}
            
            {rateLimit.error && (
              <div className="mt-2 text-xs text-amber-600">
                <p className="font-medium">Error fetching accurate rate limit data</p>
                <p>Using estimated values. Actual limits may differ.</p>
              </div>
            )}
            
            <div className="mt-2 text-xs text-muted-foreground">
              <p>Note: The analyzer caches API responses to minimize rate limit usage and allow analyzing larger repositories.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 