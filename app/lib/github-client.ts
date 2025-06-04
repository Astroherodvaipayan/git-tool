import { RepoDetails, Contributor, CommitActivity, FileContent, RepoTree } from './github';

// Cache for storing GitHub API responses
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Function to make authenticated GitHub API requests through our server-side API route
async function fetchFromGitHub(endpoint: string, params?: Record<string, any>): Promise<any> {
  // Generate cache key
  const cacheKey = `${endpoint}:${JSON.stringify(params || {})}`;
  
  // Check cache first
  const cachedItem = apiCache.get(cacheKey);
  if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_TTL) {
    console.log(`Using cached data for ${endpoint}`);
    return cachedItem.data;
  }
  
  try {
    const response = await fetch('/api/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ endpoint, params }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch from GitHub API: ${response.status}`);
    }
    
    const { data, rateLimit } = await response.json();
    
    // Update rate limit info
    updateRateLimitInfo(rateLimit);
    
    // Cache the response
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    console.error(`Error fetching from GitHub API (${endpoint}):`, error);
    throw error;
  }
}

// Rate limit information
let rateLimitInfo = {
  limit: 5000, // Default to authenticated limit
  remaining: 5000,
  reset: 0,
  used: 0,
  isAuthenticated: true,
  lastUpdated: 0,
};

// Function to update rate limit info
function updateRateLimitInfo(rateLimit: any) {
  if (rateLimit) {
    rateLimitInfo = {
      ...rateLimit,
      isAuthenticated: rateLimit.limit > 60, // If limit > 60, we're authenticated
      lastUpdated: Date.now(),
    };
  }
}

// Get current rate limit information
export function getRateLimitInfo() {
  return {
    ...rateLimitInfo,
    // For convenience, indicate if we're approaching the limit
    isLow: rateLimitInfo.remaining < rateLimitInfo.limit * 0.1,
  };
}

// Function to parse a GitHub repository URL
export function parseRepoUrl(url: string): { owner: string; repo: string } {
  try {
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
  } catch (error) {
    throw new Error("Invalid GitHub repository URL");
  }
}

// Function to get repository details
export async function getRepoDetails(owner: string, repo: string): Promise<RepoDetails> {
  const data = await fetchFromGitHub(`/repos/${owner}/${repo}`);
  
  return {
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
}

// Function to get repository contributors
export async function getContributors(owner: string, repo: string): Promise<Contributor[]> {
  try {
    const data = await fetchFromGitHub(`/repos/${owner}/${repo}/contributors`, { per_page: 100 });
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map((contributor: any) => ({
      login: contributor.login || "anonymous",
      id: contributor.id || 0,
      avatarUrl: contributor.avatar_url || "https://avatars.githubusercontent.com/u/0",
      url: contributor.html_url || `https://github.com/${owner}`,
      contributions: contributor.contributions,
    }));
  } catch (error) {
    console.error("Error fetching contributors:", error);
    return [];
  }
}

// Function to get commit activity
export async function getCommitActivity(owner: string, repo: string): Promise<CommitActivity[]> {
  try {
    console.log(`Fetching commit activity for ${owner}/${repo}`);
    const data = await fetchFromGitHub(`/repos/${owner}/${repo}/stats/commit_activity`);
    
    if (!data) {
      console.warn(`No commit activity data returned for ${owner}/${repo}`);
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.warn(`Unexpected commit activity data format for ${owner}/${repo}:`, data);
      return [];
    }
    
    if (data.length === 0) {
      console.warn(`Empty commit activity data for ${owner}/${repo}`);
      return [];
    }
    
    // Map the data to our format
    return data.map((week: any) => ({
      week: week.week || 0,
      total: week.total || 0,
      days: Array.isArray(week.days) ? week.days : [0, 0, 0, 0, 0, 0, 0],
    }));
  } catch (error) {
    console.error(`Error fetching commit activity for ${owner}/${repo}:`, error);
    // Return empty array on error
    return [];
  }
}

// Function to get repository contents
export async function getRepoContents(owner: string, repo: string, path: string = ""): Promise<FileContent[]> {
  try {
    // Skip if the path is likely to contain binary files or be too large
    if (shouldSkipPath(path)) {
      console.warn(`Skipping path ${path} as it likely contains binary or large files`);
      return [];
    }
    
    const data = await fetchFromGitHub(`/repos/${owner}/${repo}/contents/${path}`);
    
    // Handle both file and directory responses
    if (Array.isArray(data)) {
      // Directory response
      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        url: item.html_url || "#",
      }));
    } else {
      // Single file response
      return [{
        name: data.name,
        path: data.path,
        type: data.type,
        content: data.content ? Buffer.from(data.content, 'base64').toString() : undefined,
        size: data.size,
        url: data.html_url || "#",
      }];
    }
  } catch (error) {
    console.error(`Error fetching repo contents for path ${path}:`, error);
    return [];
  }
}

// Helper function to determine if a path should be skipped
function shouldSkipPath(path: string): boolean {
  const skipPatterns = [
    'node_modules', 'dist', 'build', '.git', 
    '.jpg', '.jpeg', '.png', '.gif', '.ico', 
    '.woff', '.woff2', '.ttf', '.eot', '.otf',
    '.mp4', '.webm', '.ogg', '.mp3', '.wav',
    '.pdf', '.zip', '.tar', '.gz', '.rar',
    '.dll', '.exe', '.so', '.dylib',
    'package-lock.json', 'yarn.lock'
  ];
  
  return skipPatterns.some(pattern => path.toLowerCase().includes(pattern.toLowerCase()));
}

// Function to get file content
export async function getFileContent(owner: string, repo: string, path: string): Promise<string> {
  try {
    // Skip if the file is likely to be binary or too large
    if (shouldSkipPath(path)) {
      return `// File skipped: ${path} (likely binary or too large)`;
    }
    
    const data = await fetchFromGitHub(`/repos/${owner}/${repo}/contents/${path}`);
    
    if (Array.isArray(data)) {
      throw new Error("Path points to a directory, not a file");
    }

    // Check file size first
    const fileSizeLimit = 2 * 1024 * 1024; // 2MB in bytes
    if (data.size > fileSizeLimit) { 
      return `// File too large to display: ${path} (${formatSize(data.size)}). Maximum size limit is 2MB.`;
    }

    // Check if content property exists
    if (!('content' in data)) {
      throw new Error("File content not available");
    }

    return Buffer.from(data.content, 'base64').toString();
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error);
    return `// Error loading file content: ${error instanceof Error ? error.message : "Unknown error"}`;
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

// Function to build a file tree
export async function buildFileTree(
  owner: string, 
  repo: string, 
  path: string = ""
): Promise<RepoTree> {
  try {
    // Get all files in the repository
    const files = await getRepoContents(owner, repo, path);
    
    // Create the root tree node
    const tree: RepoTree = {
      type: "folder",
      path: "",
      contents: {}
    };
    
    // Process each file and build the tree structure
    for (const file of files) {
      const pathParts = file.path.split('/');
      let currentNode = tree;
      
      // Navigate through the path parts to build the tree
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!currentNode.contents[part]) {
          currentNode.contents[part] = {
            type: "folder",
            path: pathParts.slice(0, i + 1).join('/'),
            contents: {}
          };
        }
        currentNode = currentNode.contents[part] as RepoTree;
      }
      
      // Add the file to the tree
      const fileName = pathParts[pathParts.length - 1];
      currentNode.contents[fileName] = {
        name: file.name,
        path: file.path,
        type: file.type,
        size: file.size
      };
    }
    
    return tree;
  } catch (error) {
    console.error(`Error building file tree:`, error);
    // Return an empty tree on error
    return {
      type: "folder",
      path: "",
      contents: {}
    };
  }
} 