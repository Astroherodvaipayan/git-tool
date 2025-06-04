"use client";

import { useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { AlertCircle, Key, ExternalLink, HelpCircle } from "lucide-react";
import { TokenHelp } from "./token-help";

export function TokenSetup() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Try to apply token from .env.local automatically
  useEffect(() => {
    const applyEnvToken = async () => {
      try {
        setMessage({ text: "Checking for token in .env.local...", type: "info" });
        
        // Get the rate limit first to see if we already have a token
        const rlResponse = await fetch('/api/rate-limit');
        const rlData = await rlResponse.json();
        
        if (rlData.isAuthenticated) {
          setMessage({ text: "A GitHub token is already active", type: "success" });
          setRateLimit(rlData);
          return;
        }
        
        // Check if we have an ENV token
        const tokenResponse = await fetch('/api/test-token');
        const tokenData = await tokenResponse.json();
        
        if (!tokenData.tokenFound) {
          setMessage({ 
            text: "No GitHub token found in .env.local. Please enter your token below.", 
            type: "info" 
          });
          return;
        }
        
        // Check if the token length looks suspicious (might be the placeholder)
        if (tokenData.tokenLength > 0 && tokenData.tokenPattern === '***' && 
            tokenData.tokenLength >= 20 && tokenData.tokenLength <= 30) {
          setMessage({ 
            text: "The token in .env.local appears to be the placeholder value. Please replace it with your actual GitHub token.", 
            type: "error" 
          });
          return;
        }
        
        // We have a token, let's apply it
        setLoading(true);
        const response = await fetch('/api/set-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: "ENV_TOKEN" })
        });
        
        const data = await response.json();
        
        if (data.success) {
          setMessage({ text: "GitHub token from .env.local applied successfully!", type: "success" });
          setRateLimit(data.rateLimit);
        } else {
          // Special handling for common error messages
          let errorMessage = data.error || "Unknown error";
          if (errorMessage.includes("Invalid token format")) {
            errorMessage = "The token in .env.local has an invalid format. It should be 40 characters or start with 'ghp_'";
          } else if (errorMessage.includes("No token found")) {
            errorMessage = "The GITHUB_TOKEN in .env.local is empty or still has the placeholder value.";
          }
          
          setMessage({ 
            text: `Failed to apply token from .env.local: ${errorMessage}`, 
            type: "error" 
          });
        }
      } catch (error) {
        setMessage({ 
          text: "Error checking for token: " + (error instanceof Error ? error.message : String(error)), 
          type: "error" 
        });
      } finally {
        setLoading(false);
      }
    };
    
    applyEnvToken();
  }, []);
  
  // Validate token format before submitting
  const validateToken = (token: string): boolean => {
    if (!token.trim()) {
      setMessage({ text: "Please enter a valid GitHub token", type: "error" });
      return false;
    }
    
    // Check if it's likely the placeholder from the .env.local file
    if (token === "your_personal_access_token_here") {
      setMessage({ 
        text: "Please enter your actual GitHub token, not the placeholder value", 
        type: "error" 
      });
      return false;
    }
    
    // Check for correct format - should be 40 chars or start with ghp_
    if (token.length !== 40 && !token.startsWith("ghp_")) {
      setMessage({ 
        text: "Invalid token format. GitHub tokens are 40 characters long or start with 'ghp_'", 
        type: "error" 
      });
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateToken(token)) {
      return;
    }
    
    try {
      setLoading(true);
      setMessage({ text: "Applying token...", type: "info" });
      
      // First try to set the token via the API
      const response = await fetch('/api/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ text: "GitHub token applied successfully!", type: "success" });
        setRateLimit(data.rateLimit);
        
        // Store token in sessionStorage as backup
        try {
          sessionStorage.setItem("github-token", token);
        } catch (err) {
          console.warn("Failed to store token in session storage", err);
        }
      } else {
        let errorMessage = data.error || "Unknown error";
        
        // Provide more descriptive error messages
        if (errorMessage.includes("verification failed")) {
          errorMessage = "Token verification failed. The token may be invalid or expired.";
        } else if (errorMessage.includes("Invalid token format")) {
          errorMessage = "Invalid token format. GitHub tokens should be 40 characters or start with 'ghp_'.";
        }
        
        setMessage({ text: `Failed to apply token: ${errorMessage}`, type: "error" });
      }
    } catch (error) {
      setMessage({ 
        text: "Error applying token: " + (error instanceof Error ? error.message : String(error)), 
        type: "error" 
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleReload = () => {
    window.location.reload();
  };

  const handleEnvFileUpdate = () => {
    setMessage({
      text: "To update your .env.local file, edit it directly and replace 'your_personal_access_token_here' with your actual token, then restart the application.",
      type: "info"
    });
  };
  
  const applyToken = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate token - don't proceed with placeholder or empty tokens
      if (!token || token.trim() === "" || token === "your_personal_access_token_here") {
        setError("Please enter a valid GitHub token");
        setIsLoading(false);
        return;
      }
      
      // Store in session storage - use consistent key name
      sessionStorage.setItem("github-token", token);
      
      console.log("Applying token...");
      const response = await fetch('/api/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log("Token applied successfully");
        // Refresh rate limit information
        checkRateLimit();
      } else {
        console.error("Failed to apply token:", data.error);
        setError(`Failed to apply token: ${data.error}`);
        // If there was an error with the token, remove it from session storage
        sessionStorage.removeItem("github-token");
      }
    } catch (error) {
      console.error("Error applying token:", error);
      setError(`Error applying token: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // When component mounts, try to get token from env or session storage
  useEffect(() => {
    const getInitialToken = async () => {
      try {
        // First try session storage
        const sessionToken = sessionStorage.getItem("github-token");
        if (sessionToken) {
          console.log("Found token in session storage");
          setToken(sessionToken);
          return;
        }
        
        // If not in session storage, try the API which checks .env.local
        console.log("Checking for token in .env.local...");
        const response = await fetch('/api/get-token');
        const data = await response.json();
        
        if (data.token && data.token !== "your_personal_access_token_here") {
          console.log("Found token in .env.local");
          setToken(data.token);
          // Store in session storage for consistency
          sessionStorage.setItem("github-token", data.token);
        } else {
          console.log("No valid token found in .env.local");
        }
      } catch (error) {
        console.error("Error getting initial token:", error);
      }
    };
    
    // Only run in browser
    if (typeof window !== 'undefined') {
      getInitialToken();
      checkRateLimit();
    }
  }, []);

  return (
    <>
      <Card className="border-amber-500 dark:border-amber-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" /> GitHub Token Setup
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHelp(!showHelp)} 
              className="h-8 w-8 p-0"
              title={showHelp ? "Hide detailed help" : "Show detailed help"}
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Apply a GitHub token to increase your API rate limit from 60 to 5,000 requests per hour
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className={`p-3 mb-4 rounded-md ${
              message.type === "success" ? "bg-green-500/10 text-green-600" : 
              message.type === "error" ? "bg-destructive/10 text-destructive" :
              "bg-blue-500/10 text-blue-600"
            }`}>
              <p className="text-sm flex items-start gap-2">
                {message.type === "error" && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                <span>{message.text}</span>
              </p>
            </div>
          )}
          
          {rateLimit && (
            <div className="mb-4 p-3 bg-secondary/50 rounded-md">
              <p className="font-medium">Current Rate Limit Status:</p>
              <p className="text-sm">Limit: {rateLimit.limit} requests/hour</p>
              <p className="text-sm">Remaining: {rateLimit.remaining} requests</p>
              <p className="text-sm">Authenticated: {rateLimit.isAuthenticated ? "Yes" : "No"}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Enter your GitHub personal access token below if the token in .env.local isn't being detected.
                You can generate a token at 
                <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline ml-1">
                  github.com/settings/tokens
                </a>
              </p>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full"
                disabled={loading}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={loading || !token.trim()}>
                {loading ? "Applying Token..." : "Apply Token"}
              </Button>
              
              {message?.type === "success" && (
                <Button type="button" variant="outline" onClick={handleReload}>
                  Reload Page
                </Button>
              )}
              
              <Button type="button" variant="ghost" onClick={handleEnvFileUpdate} className="text-muted-foreground">
                <ExternalLink className="h-4 w-4 mr-1" /> How to update .env.local
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground p-3 bg-secondary/30 rounded-md mt-4">
              <p className="font-medium mb-1">How to Properly Set Up Your GitHub Token:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Generate a token at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">github.com/settings/tokens</a></li>
                <li>Select the "public_repo" scope for accessing public repositories</li>
                <li>Edit the <code>.env.local</code> file in your project root</li>
                <li>Replace the text <code>your_personal_access_token_here</code> with your actual token</li>
                <li>Save the file and restart the application</li>
              </ol>
              <p className="mt-2">Alternatively, you can paste your token in the input field above for temporary usage.</p>
            </div>
          </form>
        </CardContent>
      </Card>
      
      <div className="mt-2 space-y-1">
        <p className="text-sm">
          {rateLimit ? (
            <span>
              Current Rate Limit: <strong>{rateLimit.remaining}</strong> / {rateLimit.limit} requests remaining 
              {rateLimit.isAuthenticated ? (
                <span className="text-green-600 dark:text-green-400"> (Authenticated)</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400"> (Unauthenticated)</span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">Checking rate limit...</span>
          )}
        </p>
        {rateLimit?.reset && (
          <p className="text-xs text-muted-foreground">
            Resets in {formatTimeRemaining(rateLimit.reset)}
          </p>
        )}
      </div>
      
      <div className="mt-4 mb-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs"
        >
          {showHelp ? "Hide Setup Instructions" : "Need Help Setting Up a Token?"}
        </Button>
      </div>
      
      {showHelp && (
        <div className="mt-2">
          <TokenHelp />
        </div>
      )}
    </>
  );
}

// Helper function to check the current API rate limit
async function checkRateLimit() {
  try {
    const response = await fetch('/api/rate-limit');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking rate limit:", error);
    return null;
  }
}

// Function to format time remaining until reset
function formatTimeRemaining(resetTimeInSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = resetTimeInSeconds - now;
  
  if (secondsLeft <= 0) {
    return "now";
  }
  
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
} 