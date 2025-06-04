"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { parseRepoUrl } from "../lib/github";
import { Search, AlertCircle, Github, ArrowRight } from "lucide-react";

export function RepoInputForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!url.trim()) {
        throw new Error("Please enter a GitHub repository URL");
      }

      // Parse the URL to extract owner and repo (no longer async)
      const { owner, repo } = parseRepoUrl(url);
      
      // Navigate to the analysis page
      router.push(`/repo/${owner}/${repo}`);
      
      // Note: We don't reset isLoading here because the navigation will 
      // unmount this component anyway
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid GitHub repository URL");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="flex flex-col space-y-2">
        <div 
          className={`flex w-full max-w-full items-center space-x-2 transition-all duration-300 p-1 rounded-lg ${isFocused ? 'bg-accent/50 shadow-md' : 'bg-transparent'}`}
        >
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-all duration-300">
              <Github className={`w-4 h-4 ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} />
            </div>
            <Input
              type="text"
              placeholder="https://github.com/owner/repository"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`pl-9 transition-all duration-300 ${isFocused ? 'border-primary' : ''}`}
              aria-label="GitHub repository URL"
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="relative group overflow-hidden"
          >
            <span className="relative z-10 flex items-center">
              {isLoading ? "Analyzing..." : (
                <>
                  Analyze
                  <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
            <span className="absolute inset-0 bg-primary/10 transform translate-y-full group-hover:translate-y-0 transition-transform duration-200"></span>
          </Button>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm mt-1 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Example: https://github.com/facebook/react
      </p>
    </form>
  );
} 