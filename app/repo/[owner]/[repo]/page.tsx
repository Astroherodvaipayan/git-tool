"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { RepoHeader } from "@/app/components/repo-header";
import { MetadataPanel } from "@/app/components/metadata-panel";
import { ContributorsPanel } from "@/app/components/contributors-panel";
import { CommitActivityPanel } from "@/app/components/commit-activity-panel";
import { RepoStructurePanel } from "@/app/components/repo-structure-panel";
import { SystemDiagramPanel } from "@/app/components/system-diagram-panel";
import { LLMExportPanel } from "@/app/components/llm-export-panel";
import { RateLimitInfo } from "@/app/components/rate-limit-info";
import { getRepoDetails, getContributors, getCommitActivity, getRateLimitInfo } from "@/app/lib/github-client";
import { RepoDetails } from "@/app/lib/github";
import { AlertCircle, RefreshCw } from "lucide-react";
import { TokenSetup } from "@/app/components/token-setup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface RepoAnalysisPageProps {
  params: {
    owner: string;
    repo: string;
  };
}

export default function RepoAnalysisPage({ params }: RepoAnalysisPageProps) {
  const { owner, repo } = params;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background py-4 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-foreground hover:opacity-80 transition-opacity">
              <h1 className="text-2xl font-bold">GitHub Repo Analyzer</h1>
            </Link>
            <Button variant="outline" asChild>
              <Link href="/">Analyze Another Repo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-8">Loading repository details...</div>}>
          <RepoContent owner={owner} repo={repo} />
        </Suspense>
      </main>

      <footer className="border-t py-4 bg-muted/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>GitHub Repo Analyzer &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}

function RepoContent({ owner, repo }: { owner: string; repo: string }) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorState, setErrorState] = useState<Error | null>(null);
  const [content, setContent] = useState<React.ReactNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [rateLimit, setRateLimit] = useState<any>(null);
  const [commitActivityLoading, setCommitActivityLoading] = useState(false);
  const [commitActivityError, setCommitActivityError] = useState<string | null>(null);

  const fetchRepoData = (showRetryState = false) => {
    if (showRetryState) {
      setIsRetrying(true);
    } else {
      setLoading(true);
    }
    
    // Start by fetching repository details
    getRepoDetails(owner, repo)
      .then(repoDetails => {
        // Get current rate limit info
        const rateLimitInfo = getRateLimitInfo();
        setRateLimit(rateLimitInfo);
        
        // Fetch contributors and commit activity in parallel
        return Promise.allSettled([
          getContributors(owner, repo),
          getCommitActivity(owner, repo),
        ]).then(([contributorsResult, commitActivityResult]) => {
          const contributors = contributorsResult.status === 'fulfilled' 
            ? contributorsResult.value 
            : [];
            
          const commitActivity = commitActivityResult.status === 'fulfilled' 
            ? commitActivityResult.value 
            : [];
            
          // Log data for debugging
          console.log(`Received commit activity data: ${commitActivity.length} weeks`);
          
          return {
            repoDetails,
            contributors,
            commitActivity,
            rateLimit: rateLimitInfo
          };
        });
      })
      .then(({ repoDetails, contributors, commitActivity, rateLimit }) => {
        // Clear any previous errors
        setErrorState(null);

        // Set the content with the JSX
        setContent(
          <div className="space-y-8">
            <RepoHeader repoDetails={repoDetails} />
            
            {/* Display rate limit information */}
            <RateLimitInfo rateLimit={rateLimit} />
            
            {/* Add warning if we're low on remaining API calls */}
            {rateLimit.isLow && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-200">Limited API Requests Remaining</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You're running low on GitHub API requests ({rateLimit.remaining} remaining). 
                    Some features may be unavailable.
                  </p>
                </div>
              </div>
            )}

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contributors">Contributors</TabsTrigger>
                <TabsTrigger value="commits">Commit Activity</TabsTrigger>
                <TabsTrigger value="structure">Repository Structure</TabsTrigger>
                <TabsTrigger value="system">System Diagram</TabsTrigger>
                <TabsTrigger value="llm">LLM Export</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <MetadataPanel repoDetails={repoDetails} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ContributorsPanel contributors={contributors.slice(0, 5)} />
                  <CommitActivityPanel 
                    commitActivity={commitActivity && commitActivity.length > 0 
                      ? commitActivity.slice(-12) 
                      : []}
                  />
                </div>
              </TabsContent>

              <TabsContent value="contributors">
                <ContributorsPanel contributors={contributors} showAll />
              </TabsContent>

              <TabsContent value="commits">
                <CommitActivityPanel 
                  commitActivity={commitActivity || []} 
                  detailed
                />
              </TabsContent>

              <TabsContent value="structure">
                <RepoStructurePanel owner={owner} repo={repo} />
              </TabsContent>
              
              <TabsContent value="system">
                <SystemDiagramPanel owner={owner} repo={repo} />
              </TabsContent>

              <TabsContent value="llm">
                <LLMExportPanel owner={owner} repo={repo} />
              </TabsContent>
            </Tabs>
          </div>
        );
      })
      .catch(error => {
        console.error("Error in RepoContent:", error);
        setErrorState(error instanceof Error ? error : new Error("An unknown error occurred"));
      })
      .finally(() => {
        setLoading(false);
        if (showRetryState) {
          setIsRetrying(false);
        }
      });
  };
  
  // Initial data fetch
  useEffect(() => {
    fetchRepoData();
  }, [owner, repo]);
  
  // Handle retry
  const handleRetry = () => {
    fetchRepoData(true);
  };
  
  // If we're retrying, show a loading state
  if (isRetrying) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Retrying...</p>
        </div>
      </div>
    );
  }
  
  // If we have an error, show the error state
  if (errorState) {
    const isRateLimitError = errorState.message.includes("rate limit") || errorState.message.includes("API rate limited");
    
    const isNotFoundError = errorState.message.includes("could not be found") || 
                           errorState.message.includes("not exist") || 
                           errorState.message.includes("404");
    
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="bg-destructive/10 p-6 rounded-lg border border-destructive mb-6">
          <h2 className="text-2xl font-bold text-destructive mb-2">
            {isRateLimitError 
              ? "GitHub API Rate Limit Exceeded" 
              : isNotFoundError 
                ? "Repository Not Found" 
                : "Error Loading Repository"}
          </h2>
          <p className="mb-4">
            {errorState.message}
          </p>
          <p className="text-sm text-muted-foreground">
            {isRateLimitError ? (
              <span>
                The GitHub API rate limit has been reached. Please try again later.
              </span>
            ) : isNotFoundError ? (
              <span>
                The repository you're trying to view either doesn't exist or is private. 
                Please check the repository owner and name, and ensure the repository is public.
              </span>
            ) : (
              <span>
                This could be due to:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>GitHub API rate limits</li>
                  <li>Repository does not exist or is private</li>
                  <li>Network connectivity issues</li>
                  <li>Temporary GitHub service outage</li>
                </ul>
              </span>
            )}
          </p>
          
          <div className="mt-4 flex">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry} 
              disabled={isRetrying}
              className="mr-2"
            >
              <RefreshCw size={16} className={`mr-1 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button variant="outline" asChild>
            <Link href="/">Try Another Repository</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  // Show content if available
  if (content && !loading) {
    return content;
  }
  
  // Loading state (initial load)
  return (
    <div className="flex justify-center items-center py-16">
      <div className="flex flex-col items-center space-y-4">
        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading repository data...</p>
      </div>
    </div>
  );
} 