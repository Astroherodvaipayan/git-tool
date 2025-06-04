"use client";

import { AlertCircle, Info, Clock } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { useState, useEffect } from "react";

interface RateLimitProps {
  rateLimit: {
    limit: number;
    remaining: number;
    reset: number;
    isAuthenticated: boolean;
  };
}

export function RateLimitInfo({ rateLimit }: RateLimitProps) {
  // State for time-based values that need to be calculated client-side
  const [timeUntilResetString, setTimeUntilResetString] = useState<string>("");
  const [resetTimeString, setResetTimeString] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);
  
  // Calculate reset time in a human-readable format
  const resetDate = new Date(rateLimit.reset * 1000);
  
  // Calculate percentage of rate limit used
  const percentUsed = Math.round(((rateLimit.limit - rateLimit.remaining) / rateLimit.limit) * 100);
  const isLow = rateLimit.remaining < 10 || percentUsed > 90;
  const isMedium = !isLow && rateLimit.remaining < Math.ceil(rateLimit.limit * 0.25); // Below 25%
  
  // Use useEffect to calculate time-based values client-side
  useEffect(() => {
    setIsMounted(true);
    
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
    
    // Calculate time until reset
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
  }, [resetDate]);
  
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
    <Card className={`${getBorderClass()} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {isLow ? (
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          ) : isMedium ? (
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
          )}
          
          <div className="w-full">
            <div className="flex justify-between items-center">
              <p className={`text-sm font-medium ${isLow ? "text-destructive" : isMedium ? "text-amber-600 dark:text-amber-400" : ""}`}>
                GitHub API Rate Limit: {rateLimit.remaining} / {rateLimit.limit} requests remaining
              </p>
              <p className="text-xs text-muted-foreground">
                Resets in: {isMounted ? timeUntilResetString : "calculating..."}
              </p>
            </div>
            
            <div className="mt-2 h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getProgressBarClass()}`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>
            
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
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
              <div className="mt-3 text-xs text-destructive bg-destructive/5 p-2 rounded-md">
                <p className="font-medium">Warning: Rate limit nearly exhausted</p>
                <p>Some features may be unavailable until the limit resets.</p>
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