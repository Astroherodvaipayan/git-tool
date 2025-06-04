"use client";

import { useState, useEffect } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

interface UNGHFallbackNoticeProps {
  isActive?: boolean;
}

export function UNGHFallbackNotice({ isActive = false }: UNGHFallbackNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  // If the component is mounted without isActive, check session storage
  // to see if we've previously used the fallback in this session
  useEffect(() => {
    if (!isActive) {
      const hasPreviouslyUsedFallback = sessionStorage.getItem('ungh_fallback_used') === 'true';
      if (hasPreviouslyUsedFallback && !dismissed) {
        // We'll show the notice but in a less prominent way
      }
    } else {
      // We're actively using the fallback now, so record this
      sessionStorage.setItem('ungh_fallback_used', 'true');
    }
  }, [isActive]);

  if (dismissed) {
    return null;
  }

  return (
    <Card className={`border-amber-400 shadow-sm mb-6 ${isActive ? '' : 'opacity-80'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          
          <div className="w-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">
                  {isActive 
                    ? "Using UNGH.cc API Fallback Mode" 
                    : "Rate Limited Mode Was Used Recently"}
                </p>
                <p className="text-sm mt-1 text-amber-600 dark:text-amber-300">
                  GitHub API rate limits were reached. Some data is being served from UNGH.cc, an unofficial 
                  GitHub API proxy. Limited information may be available.
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground h-8 px-2 -mt-1 -mr-2" 
                onClick={() => setDismissed(true)}
              >
                ✕
              </Button>
            </div>

            <div className="flex mt-2 space-x-3 text-xs">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://github.com/unjs/ungh" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  About UNGH.cc <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://github.com/settings/tokens" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  Create GitHub Token <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 