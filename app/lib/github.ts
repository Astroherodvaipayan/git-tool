import { Octokit } from "@octokit/rest";
import { repoCache, contentCache, rateLimitCache } from "@/app/lib/cache";

// Add UNGH.cc support for rate limit bypass
const ENABLE_UNGH_FALLBACK = false; // Disabled to prevent synthetic data generation

// FIXING THE ROOT CAUSE: 
// Rather than initializing Octokit once, we'll create a function that returns
// a properly configured Octokit instance with the latest token
function createOctokit(token?: string) {
  // First try the provided token parameter (highest priority)
  // Then try the environment variable (will work on server-side)
  const githubToken = token || process.env.GITHUB_TOKEN;
  
  console.log("GitHub authentication status:", githubToken ? "Using token" : "No token available");
  
  return new Octokit(
    githubToken
      ? {
          auth: githubToken,
          // Add retry and throttling options
          throttle: {
            onRateLimit: (retryAfter: number, options: any, octokit: any) => {
              console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
              
              // Retry twice after hitting a rate limit
              if (options.request.retryCount < 2) {
                console.log(`Retrying after ${retryAfter} seconds!`);
                return true;
              }
              
              return false;
            },
            onSecondaryRateLimit: (retryAfter: number, options: any, octokit: any) => {
              // Secondary rate limit (abuse detection)
              console.warn(`Secondary rate limit detected for request ${options.method} ${options.url}`);
              return true; // Always retry
            },
          },
        }
      : {
          // Even for unauthenticated requests, add some retry logic
          throttle: {
            onRateLimit: (retryAfter: number, options: any, octokit: any) => {
              console.warn(`Request quota exhausted for request ${options.method} ${options.url}`);
              return false; // Don't retry, just fail
            },
            onSecondaryRateLimit: (retryAfter: number, options: any, octokit: any) => {
              // Secondary rate limit (abuse detection)
              console.warn(`Secondary rate limit detected for request ${options.method} ${options.url}`);
              return false; // Don't retry, just fail
            },
          },
        }
  );
}

// UNGH.cc API helpers for fallback when rate limited
async function fetchFromUNGH(endpoint: string) {
  try {
    console.log(`Fetching from UNGH.cc: ${endpoint}`);
    const response = await fetch(`https://ungh.cc${endpoint}`);
    if (!response.ok) {
      throw new Error(`UNGH.cc API error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching from UNGH.cc:", error);
    throw error;
  }
}

// Default instance, might not have the token if created at startup
let octokit = createOctokit();

// Function to update the token - call this before making API requests
export function updateGitHubToken(token: string) {
  console.log("Updating GitHub token");
  octokit = createOctokit(token);
  return isAuthenticated();
}

// Function to check if we're using authenticated requests
export function isAuthenticated(): boolean {
  try {
    // @ts-ignore - accessing private property for verification
    return !!octokit.auth?.token;
  } catch (e) {
    return false; 
  }
}

// Check if we're getting close to rate limit
export function isApproachingRateLimit(remaining: number, limit: number): boolean {
  // If we have less than 10% of our quota left, we're approaching rate limit
  return remaining < (limit * 0.1);
}

export interface RepoDetails {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  primaryLanguage: string;
  license: string;
  updatedAt: string;
  createdAt: string;
  url: string;
  defaultBranch: string;
  size: number;
  openIssuesCount: number;
}

export interface Contributor {
  login: string;
  id: number;
  avatarUrl: string;
  url: string;
  contributions: number;
}

export interface CommitActivity {
  week: number;
  total: number;
  days: number[];
}

export interface FileContent {
  name: string;
  path: string;
  type: string;
  content?: string;
  size: number;
  url: string;
  children?: FileContent[];
}

// Adding these types needed by the LLMExportPanel
export interface FileEntry {
  name: string;
  path: string;
  type: string;
  size?: number;
  content?: string;
}

export interface RepoTree {
  type: string;
  path: string;
  contents: { [key: string]: RepoTree | FileEntry };
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  // Handle different GitHub URL formats
  const urlObj = new URL(url);
  if (urlObj.hostname !== "github.com") {
    throw new Error("Not a valid GitHub URL");
  }

  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  if (pathParts.length < 2) {
    throw new Error("Invalid GitHub repository URL");
  }

  return {
    owner: pathParts[0],
    repo: pathParts[1],
  };
}

export async function getRepoDetails(owner: string, repo: string): Promise<RepoDetails> {
  // Generate cache key
  const cacheKey = `repo-details:${owner}/${repo}`;
  
  // Check cache first
  const cachedData = repoCache.get<RepoDetails>(cacheKey);
  if (cachedData) {
    console.log(`Using cached repository details for ${owner}/${repo}`);
    return cachedData;
  }
  
  try {
    // First check if we're close to the rate limit
    const rateLimit = await getRateLimit();
    if (isApproachingRateLimit(rateLimit.remaining, rateLimit.limit)) {
      console.warn("Approaching GitHub API rate limit. Some features may be disabled.");
    }
    
    const response = await octokit.repos.get({
      owner,
      repo,
    });

    const data = response.data;
    const result = {
      owner: data.owner.login,
      name: data.name,
      fullName: data.full_name,
      description: data.description || "",
      stars: data.stargazers_count,
      forks: data.forks_count,
      watchers: data.watchers_count,
      primaryLanguage: data.language || "Not specified",
      license: data.license?.name || "No license",
      updatedAt: data.updated_at,
      createdAt: data.created_at,
      url: data.html_url,
      defaultBranch: data.default_branch,
      size: data.size,
      openIssuesCount: data.open_issues_count,
    };
    
    // Cache the result
    repoCache.set(cacheKey, result);
    
    return result;
  } catch (error: any) {
    // If we hit rate limit and UNGH fallback is enabled, try UNGH.cc API
    if (ENABLE_UNGH_FALLBACK && error.status === 403 && 
        (error.message?.includes("rate limit") || error.headers?.["x-ratelimit-remaining"] === "0")) {
      
      try {
        console.log(`Trying UNGH.cc API fallback for ${owner}/${repo} repo details`);
        const unghData = await fetchFromUNGH(`/repos/${owner}/${repo}`);
        
        if (unghData && unghData.repo) {
          const data = unghData.repo;
          const result = {
            owner: owner,
            name: data.name,
            fullName: `${owner}/${repo}`,
            description: data.description || "",
            stars: data.stars || 0,
            forks: data.forks || 0,
            watchers: data.watchers || 0,
            primaryLanguage: data.language || "Not specified",
            license: "License info not available via UNGH.cc",
            updatedAt: data.updatedAt || new Date().toISOString(),
            createdAt: data.createdAt || new Date().toISOString(),
            url: `https://github.com/${owner}/${repo}`,
            defaultBranch: data.defaultBranch || "main",
            size: data.size || 0,
            openIssuesCount: data.openIssues || 0,
          };
          
          // Cache the result
          repoCache.set(cacheKey, result);
          
          return result;
        }
      } catch (unghError) {
        console.error("UNGH.cc fallback failed:", unghError);
        // Continue to the regular error handling below
      }
    }
    
    handleApiError(error, "repository details");
  }
}

export async function getContributors(owner: string, repo: string): Promise<Contributor[]> {
  // Generate cache key
  const cacheKey = `contributors:${owner}/${repo}`;
  
  // Check cache first
  const cachedData = repoCache.get<Contributor[]>(cacheKey);
  if (cachedData) {
    console.log(`Using cached contributors for ${owner}/${repo}`);
    return cachedData;
  }
  
  try {
    const response = await octokit.repos.listContributors({
      owner,
      repo,
      per_page: 100,
    });

    // Check if the response is empty
    if (!response.data || response.data.length === 0) {
      console.warn("GitHub API returned empty contributors data.");
      return []; // Return empty array instead of fake data
    }

    const result = response.data.map(contributor => ({
      login: contributor.login || "anonymous",
      id: contributor.id || 0,
      avatarUrl: contributor.avatar_url || "https://avatars.githubusercontent.com/u/0",
      url: contributor.html_url || `https://github.com/${owner}`,
      contributions: contributor.contributions,
    }));
    
    // Cache the result
    repoCache.set(cacheKey, result);
    
    return result;
  } catch (error: any) {
    // If we hit rate limit and UNGH fallback is enabled, try UNGH.cc API
    if (ENABLE_UNGH_FALLBACK && error.status === 403 && 
        (error.message?.includes("rate limit") || error.headers?.["x-ratelimit-remaining"] === "0")) {
      
      try {
        console.log(`Trying UNGH.cc API fallback for ${owner}/${repo} contributors`);
        // Note: UNGH.cc doesn't provide contributors directly, so we'll create minimal placeholder data
        // This allows the UI to work without erroring out
        
        // Create placeholder data with just the repository owner as a contributor
        const placeholderContributors: Contributor[] = [
          {
            login: owner,
            id: 0,
            avatarUrl: `https://avatars.githubusercontent.com/${owner}`,
            url: `https://github.com/${owner}`,
            contributions: 1
          },
          {
            login: "Rate Limited",
            id: 1,
            avatarUrl: "https://avatars.githubusercontent.com/u/0",
            url: "#",
            contributions: 0
          }
        ];
        
        // Cache the placeholder result with short TTL
        repoCache.set(cacheKey, placeholderContributors, 60 * 1000); // 1 minute cache only for placeholders
        
        return placeholderContributors;
      } catch (unghError) {
        console.error("UNGH.cc fallback failed:", unghError);
        // Continue to the regular error handling below
      }
    }
    
    // For contributors, we'll handle this differently - return empty array instead of failing
    console.error("Error fetching contributors:", error);
    
    // If it's a rate limit error, rethrow it
    if (error.status === 403 && (error.message?.includes("rate limit") || 
       error.headers?.["x-ratelimit-remaining"] === "0")) {
      throw error;
    }
    
    // For other errors, return empty array with a console warning
    console.warn("Returning empty contributors array due to API error");
    return [];
  }
}

export async function getCommitActivity(owner: string, repo: string, retryCount = 0): Promise<CommitActivity[]> {
  // Generate cache key
  const cacheKey = `commit-activity:${owner}/${repo}`;
  
  // Check cache first
  const cachedData = repoCache.get<CommitActivity[]>(cacheKey);
  if (cachedData) {
    console.log(`Using cached commit activity data for ${owner}/${repo}`);
    return cachedData;
  }
  
  try {
    const response = await octokit.repos.getCommitActivityStats({
      owner,
      repo,
    });

    // Check for 202 status - GitHub is generating the statistics
    if (response.status === 202) {
      if (retryCount < 3) {
        console.log(`GitHub is computing commit activity stats, retrying in 3 seconds (${retryCount + 1}/3)...`);
        // Wait 3 seconds and retry (GitHub needs time to compute stats)
        await new Promise(resolve => setTimeout(resolve, 3000));
        return getCommitActivity(owner, repo, retryCount + 1);
      } else {
        // After 3 retries, return a special state that indicates still computing
        throw new Error("GitHub is still computing commit activity statistics. Please try again in a few moments.");
      }
    }
    
    // Check if the response is empty or still being generated by GitHub
    if (!response.data || response.data.length === 0) {
      console.warn("GitHub API returned empty commit activity data.");
      return []; // Return empty array instead of fake data
    }

    // Ensure response.data is an array
    if (!Array.isArray(response.data)) {
      console.warn("GitHub API returned commit activity in unexpected format:", response.data);
      return [];
    }

    // Map the data to our format, with safety checks
    const result = response.data.map(week => {
      // Check if the week object has the expected properties
      if (typeof week !== 'object' || week === null) {
        console.warn('Invalid week data in commit activity:', week);
        return {
          week: 0,
          total: 0,
          days: [0, 0, 0, 0, 0, 0, 0]
        };
      }
      
      return {
        week: typeof week.week === 'number' ? week.week : 0,
        total: typeof week.total === 'number' ? week.total : 0,
        days: Array.isArray(week.days) ? week.days : [0, 0, 0, 0, 0, 0, 0]
      };
    });
    
    // Cache the result
    repoCache.set(cacheKey, result);
    
    return result;
  } catch (error: any) {
    console.error("Error fetching commit activity:", error);
    
    // If it's a rate limit error, rethrow it so the UI can handle it properly
    if (error.status === 403 && (error.message?.includes("rate limit") || 
       error.headers?.["x-ratelimit-remaining"] === "0")) {
      throw new Error("GitHub API rate limit exceeded. Please try again later.");
    }
    
    // If it's a 404 error, the repository might not exist
    if (error.status === 404) {
      throw new Error("Repository not found or you don't have access to it.");
    }
    
    // Try an alternative approach if the stats API fails (GitHub sometimes takes time to compute stats)
    try {
      console.log("Attempting to fetch commit data using alternative method...");
      return await getCommitActivityAlternative(owner, repo);
    } catch (fallbackError) {
      console.error("Alternative commit fetching also failed:", fallbackError);
      // For other errors, return empty array with a console warning
      console.warn("Returning empty commit activity array due to API error");
      return [];
    }
  }
}

// Alternative method to generate commit activity data from the commits list
async function getCommitActivityAlternative(owner: string, repo: string): Promise<CommitActivity[]> {
  try {
    // Get commits from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const response = await octokit.repos.listCommits({
      owner,
      repo,
      since: thirtyDaysAgo.toISOString(),
      per_page: 100 // Maximum allowed
    });
    
    if (!response.data || response.data.length === 0) {
      return [];
    }
    
    // Group commits by week
    const weeklyCommits = new Map<number, { total: number, days: number[] }>();
    
    // Initialize the last 4 weeks
    const currentTime = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 4; i++) {
      const weekTime = currentTime - (i * 7 * 24 * 60 * 60);
      const weekStart = weekTime - (weekTime % (7 * 24 * 60 * 60));
      weeklyCommits.set(weekStart, { total: 0, days: [0, 0, 0, 0, 0, 0, 0] });
    }
    
    // Count commits by week and day
    response.data.forEach(commit => {
      if (!commit.commit?.author?.date) return;
      
      const commitDate = new Date(commit.commit.author.date);
      const commitTime = Math.floor(commitDate.getTime() / 1000);
      const weekStart = commitTime - (commitTime % (7 * 24 * 60 * 60));
      const dayOfWeek = commitDate.getUTCDay(); // 0 = Sunday, 6 = Saturday
      
      if (!weeklyCommits.has(weekStart)) {
        weeklyCommits.set(weekStart, { total: 0, days: [0, 0, 0, 0, 0, 0, 0] });
      }
      
      const week = weeklyCommits.get(weekStart)!;
      week.total += 1;
      week.days[dayOfWeek] += 1;
    });
    
    // Convert the map to array format expected by the UI
    const result: CommitActivity[] = Array.from(weeklyCommits.entries())
      .map(([week, data]) => ({
        week,
        total: data.total,
        days: data.days
      }))
      .sort((a, b) => a.week - b.week);
    
    return result;
  } catch (error) {
    console.error("Error in alternative commit fetching:", error);
    return [];
  }
}

export async function getRepoContents(owner: string, repo: string, path: string = "", maxSize: number = 1000, retryCount = 0): Promise<FileContent[]> {
  // Generate cache key
  const cacheKey = `repo-contents:${owner}/${repo}:${path}`;
  
  // Check cache first
  const cachedData = contentCache.get<FileContent[]>(cacheKey);
  if (cachedData) {
    console.log(`Using cached repository contents for ${owner}/${repo}/${path}`);
    return cachedData;
  }
  
  try {
    // Skip if the path is likely to contain binary files or be too large
    if (shouldSkipPath(path)) {
      console.warn(`Skipping path ${path} as it likely contains binary or large files`);
      return [];
    }
    
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    // Handle both file and directory responses
    let result: FileContent[];
    if (Array.isArray(response.data)) {
      result = response.data.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type as string,
        size: item.size,
        url: item.html_url || "#",
      }));
    } else {
      // Single file
      const fileData = response.data;
      result = [{
        name: fileData.name,
        path: fileData.path,
        type: fileData.type as string,
        content: 'content' in fileData && fileData.content ? Buffer.from(fileData.content, 'base64').toString() : undefined,
        size: fileData.size,
        url: fileData.html_url || "#",
      }];
    }
    
    // Cache the successful result
    contentCache.set(cacheKey, result);
    
    return result;
  } catch (error: any) {
    console.error(`Error fetching repo contents for path ${path}:`, error);
    
    // If it's a rate limit error, attempt to retry after a delay if we have retries left
    if (error.status === 403 && 
        (error.message?.includes("rate limit") || error.headers?.["x-ratelimit-remaining"] === "0")) {
      
      // Try to get rate limit info to determine when we can retry
      try {
        const rateLimit = await getRateLimit();
        const resetTime = rateLimit.reset;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToReset = Math.max(resetTime - currentTime, 0);
        
        // If we have retries left and it's not going to be too long, wait and retry
        if (retryCount < 2 && timeToReset < 30) {
          console.log(`Rate limited, retrying in ${timeToReset + 1} seconds... (retry ${retryCount + 1}/2)`);
          
          // Wait until reset time + 1 second for safety
          await new Promise(resolve => setTimeout(resolve, (timeToReset + 1) * 1000));
          
          // Try again with incremented retry count
          return getRepoContents(owner, repo, path, maxSize, retryCount + 1);
        }
      } catch (rateLimitError) {
        // If we can't get rate limit info, just continue with the original error
        console.error("Failed to get rate limit info for retry:", rateLimitError);
      }
      
      // If we're out of retries or it's too long to wait, throw a clear message
      throw new Error(`GitHub API rate limit exceeded when fetching contents for path: ${path}. ${isAuthenticated() ? 
        "Try again later." : 
        "Add a GitHub token to increase your rate limit from 60 to 5,000 requests per hour."}`);
    }
    
    // For not found errors, return empty array
    if (error.status === 404) {
      console.warn(`Path ${path} not found, returning empty array`);
      return [];
    }
    
    // For other errors, return empty array with console warning
    console.warn(`Error fetching contents for ${path}, returning empty array`);
    return [];
  }
}

// Helper function to determine if a path should be skipped
function shouldSkipPath(path: string): boolean {
  const skipPatterns = [
    'node_modules', 'dist', 'build', '.git', 
    // Only skip actual binary image formats, not SVG which is text-based
    '.jpg', '.jpeg', '.png', '.gif', '.ico', 
    // Skip binary font files
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    // Skip binary media files
    '.mp4', '.webm', '.ogg', '.mp3', '.wav',
    // Skip binary document and archive files
    '.pdf', '.zip', '.tar', '.gz', '.rar',
    // Skip binary executable files
    '.dll', '.exe', '.so', '.dylib',
    // Skip lock files that are usually very large
    'package-lock.json', 'yarn.lock'
  ];
  
  return skipPatterns.some(pattern => path.toLowerCase().includes(pattern.toLowerCase()));
}

export async function buildFileTree(
  owner: string, 
  repo: string, 
  path: string = "", 
  maxDepth: number = 3, 
  currentDepth: number = 0,
  retryCount = 0
): Promise<FileContent[]> {
  // Generate cache key
  const cacheKey = `file-tree:${owner}/${repo}:${path}:${maxDepth}:${currentDepth}`;
  
  // Check cache first
  const cachedData = contentCache.get<FileContent[]>(cacheKey);
  if (cachedData) {
    console.log(`Using cached file tree for ${owner}/${repo}/${path} at depth ${currentDepth}`);
    return cachedData;
  }
  
  // Limit depth to avoid excessive API calls
  if (currentDepth >= maxDepth) {
    console.warn(`Reached maximum depth of ${maxDepth} for path ${path}, not fetching children`);
    return [];
  }
  
  try {
    const contents = await getRepoContents(owner, repo, path);
    
    const result: FileContent[] = [];
    
    // Limit the number of directories we process at each level to avoid excessive API calls
    const dirsToProcess = contents
      .filter(item => item.type === "dir")
      .slice(0, 25); // Process at most 25 directories at each level (increased from 10)
    
    for (const item of contents) {
      if (item.type === "dir" && dirsToProcess.includes(item)) {
        try {
          const children = await buildFileTree(owner, repo, item.path, maxDepth, currentDepth + 1);
          result.push({
            ...item,
            children,
          });
        } catch (error) {
          // Handle errors but continue processing
          console.error(`Error processing directory ${item.path}:`, error);
          result.push({
            ...item,
            children: [], // Empty children array instead of undefined
          });
        }
      } else {
        result.push(item);
      }
    }
    
    // Cache the successful result
    contentCache.set(cacheKey, result);
    
    return result;
  } catch (error: any) {
    console.error(`Error building file tree for ${path}:`, error);
    
    // If it's a rate limit error, attempt to retry after a delay if we have retries left
    if (error.status === 403 && 
        (error.message?.includes("rate limit") || error.headers?.["x-ratelimit-remaining"] === "0")) {
      
      // Try to get rate limit info to determine when we can retry
      try {
        const rateLimit = await getRateLimit();
        const resetTime = rateLimit.reset;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToReset = Math.max(resetTime - currentTime, 0);
        
        // If we have retries left and it's not going to be too long, wait and retry
        if (retryCount < 2 && timeToReset < 30) {
          console.log(`Rate limited, retrying file tree in ${timeToReset + 1} seconds... (retry ${retryCount + 1}/2)`);
          
          // Wait until reset time + 1 second for safety
          await new Promise(resolve => setTimeout(resolve, (timeToReset + 1) * 1000));
          
          // Try again with incremented retry count
          return buildFileTree(owner, repo, path, maxDepth, currentDepth, retryCount + 1);
        }
      } catch (rateLimitError) {
        // If we can't get rate limit info, just continue with the original error
        console.error("Failed to get rate limit info for retry:", rateLimitError);
      }
      
      // If we're out of retries or it's too long to wait, throw a clear message
      throw new Error(`GitHub API rate limit exceeded when building file tree for path: ${path}. ${isAuthenticated() ? 
        "Try again later." : 
        "Add a GitHub token to increase your rate limit from 60 to 5,000 requests per hour."}`);
    }
    
    // For other errors, return empty array
    return [];
  }
}

export async function getFileContent(owner: string, repo: string, path: string, retryCount = 0): Promise<string> {
  // Generate cache key
  const cacheKey = `file-content:${owner}/${repo}:${path}`;
  
  // Check cache first
  const cachedData = contentCache.get<string>(cacheKey);
  if (cachedData) {
    console.log(`Using cached file content for ${owner}/${repo}/${path}`);
    return cachedData;
  }
  
  try {
    // Skip if the file is likely to be binary or too large
    if (shouldSkipPath(path)) {
      return `// File skipped: ${path} (likely binary or too large)`;
    }
    
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(response.data)) {
      throw new Error("Path points to a directory, not a file");
    }

    // Check file size first - increase limit to 2MB for LLM exports
    const fileSizeLimit = 2 * 1024 * 1024; // 2MB in bytes
    if (response.data.size > fileSizeLimit) { 
      return `// File too large to display: ${path} (${formatSize(response.data.size)}). Maximum size limit is 2MB.`;
    }

    // Check if content property exists (for symlinks it might not)
    if (!('content' in response.data)) {
      throw new Error("File content not available");
    }

    const content = response.data.content;
    const decodedContent = Buffer.from(content, 'base64').toString();
    
    // Cache the successful result
    contentCache.set(cacheKey, decodedContent);
    
    return decodedContent;
  } catch (error: any) {
    console.error(`Error fetching file content for ${path}:`, error);
    
    // If it's a rate limit error, attempt to retry after a delay if we have retries left
    if (error.status === 403 && 
        (error.message?.includes("rate limit") || error.headers?.["x-ratelimit-remaining"] === "0")) {
      
      // Try to get rate limit info to determine when we can retry
      try {
        const rateLimit = await getRateLimit();
        const resetTime = rateLimit.reset;
        const currentTime = Math.floor(Date.now() / 1000);
        const timeToReset = Math.max(resetTime - currentTime, 0);
        
        // If we have retries left and it's not going to be too long, wait and retry
        if (retryCount < 2 && timeToReset < 30) {
          console.log(`Rate limited, retrying file content in ${timeToReset + 1} seconds... (retry ${retryCount + 1}/2)`);
          
          // Wait until reset time + 1 second for safety
          await new Promise(resolve => setTimeout(resolve, (timeToReset + 1) * 1000));
          
          // Try again with incremented retry count
          return getFileContent(owner, repo, path, retryCount + 1);
        }
      } catch (rateLimitError) {
        // If we can't get rate limit info, just continue with the original error
        console.error("Failed to get rate limit info for retry:", rateLimitError);
      }
      
      // If we're out of retries or it's too long to wait, throw a clear message
      throw new Error(`GitHub API rate limit exceeded when fetching file content. ${isAuthenticated() ? 
        "Try again later." : 
        "Add a GitHub token to increase your rate limit from 60 to 5,000 requests per hour."}`);
    }
    
    // For not found errors, return a specific message
    if (error.status === 404) {
      return `// File not found: ${path}`;
    }
    
    // For other errors, return a generic message
    return `// Error loading file content: ${error.message || "Unknown error"}`;
  }
}

// Helper function to format file size
function formatSize(sizeInBytes: number): string {
  if (sizeInBytes >= 1024 * 1024) {
    return (sizeInBytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (sizeInBytes >= 1024) {
    return (sizeInBytes / 1024).toFixed(1) + ' KB';
  }
  return sizeInBytes + ' bytes';
}

// Function to get rate limit information
export async function getRateLimit(): Promise<{
  limit: number;
  remaining: number;
  reset: number;
  isAuthenticated: boolean;
}> {
  // Check cache first
  const cacheKey = 'rate-limit';
  const cachedData = rateLimitCache.get<{
    limit: number;
    remaining: number;
    reset: number;
    isAuthenticated: boolean;
  }>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await octokit.rateLimit.get();
    const { limit, remaining, reset } = response.data.rate;
    
    const result = {
      limit,
      remaining,
      reset,
      isAuthenticated: isAuthenticated(),
    };
    
    // Cache the result
    rateLimitCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error("Error fetching rate limit:", error);
    throw new Error("Failed to fetch rate limit information");
  }
}

// Helper function to handle common error responses
function handleApiError(error: any, entityName: string): never {
  console.error(`Error fetching ${entityName}:`, error);
  
  // Check for rate limit errors
  if (error.status === 403 && 
      (error.message?.includes("rate limit") || 
       error.headers?.["x-ratelimit-remaining"] === "0")) {
    throw new Error(`GitHub API rate limit exceeded. ${isAuthenticated() ? 
      "Try again later." : 
      "Add a GITHUB_TOKEN to increase your rate limit from 60 to 5,000 requests per hour."}`);
  }
  
  // Check for not found errors
  if (error.status === 404) {
    throw new Error(`The requested ${entityName} could not be found. The repository may be private or does not exist.`);
  }
  
  // Check for validation errors
  if (error.status === 422) {
    throw new Error(`Invalid request when fetching ${entityName}. Please check the repository name and owner.`);
  }
  
  // For other errors
  throw new Error(`Unable to fetch ${entityName}. GitHub API may be unavailable or rate limited.`);
}

// Calculate metrics from the API data
export function calculateMetrics(commitActivity: CommitActivity[], contributors: Contributor[]) {
  // Prevent division by zero
  if (!commitActivity.length) {
    return {
      averageCommitsPerWeek: 0,
      totalCommits: 0,
      mostActiveContributors: [],
      activityTrend: {
        trend: "stable",
        changePercent: 0,
      },
    };
  }
  
  // Calculate average commits per week
  const totalCommits = commitActivity.reduce((sum, week) => sum + week.total, 0);
  const averageCommitsPerWeek = totalCommits / commitActivity.length;
  
  // Get most active contributors
  const mostActiveContributors = [...contributors].sort((a, b) => b.contributions - a.contributions).slice(0, 5);
  
  // Find activity trends (increasing, decreasing, stable)
  const recentWeeks = commitActivity.slice(-4);
  const olderWeeks = commitActivity.slice(-8, -4);
  
  let recentAvg = 0;
  let olderAvg = 0;
  
  if (recentWeeks.length) {
    recentAvg = recentWeeks.reduce((sum, week) => sum + week.total, 0) / recentWeeks.length;
  }
  
  if (olderWeeks.length) {
    olderAvg = olderWeeks.reduce((sum, week) => sum + week.total, 0) / olderWeeks.length;
  }
  
  let trend = "stable";
  let changePercent = 0;
  
  if (olderAvg > 0) {
    changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (changePercent > 20) {
      trend = "increasing";
    } else if (changePercent < -20) {
      trend = "decreasing";
    }
  }
  
  return {
    averageCommitsPerWeek,
    totalCommits,
    mostActiveContributors,
    activityTrend: {
      trend,
      changePercent,
    },
  };
} 