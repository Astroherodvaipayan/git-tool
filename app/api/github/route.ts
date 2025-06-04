import { NextRequest, NextResponse } from 'next/server';

// Function to ensure PAT is never exposed in responses or logs
const sanitizeResponse = (data: any): any => {
  // If data is a string, check for any PAT-like patterns
  if (typeof data === 'string') {
    // Replace anything that looks like a PAT (ghp_... format) with [REDACTED]
    return data.replace(/ghp_[a-zA-Z0-9]{36}/g, '[REDACTED]');
  }
  
  // If data is an object, recursively sanitize all properties
  if (typeof data === 'object' && data !== null) {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const key in sanitized) {
      if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeResponse(sanitized[key]);
      }
    }
    
    return sanitized;
  }
  
  return data;
};

export async function POST(request: NextRequest) {
  try {
    const { endpoint, params } = await request.json();
    
    if (!endpoint) {
      return NextResponse.json({ error: 'No GitHub API endpoint specified' }, { status: 400 });
    }
    
    // Construct the GitHub API URL
    const apiUrl = `https://api.github.com${endpoint}`;
    
    // Set up query parameters if provided
    const url = new URL(apiUrl);
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    // Set up headers with authentication
    const headers = {
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'GitHub-Repo-Analyzer',
    };
    
    // Make the authenticated request
    console.log(`Making GitHub API request to: ${url.toString().replace(/\?.*/, '?[PARAMS]')}`);
    const response = await fetch(url.toString(), { headers });
    
    // Get rate limit info from headers
    const rateLimit = {
      limit: Number(response.headers.get('x-ratelimit-limit') || 0),
      remaining: Number(response.headers.get('x-ratelimit-remaining') || 0),
      reset: Number(response.headers.get('x-ratelimit-reset') || 0),
      used: Number(response.headers.get('x-ratelimit-used') || 0),
    };
    
    // If the response is not ok, return the error
    if (!response.ok) {
      console.error(`GitHub API error (${response.status}): ${response.statusText}`);
      
      // Try to get the error message from the response
      let errorMessage = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || response.statusText;
      } catch {
        errorMessage = response.statusText;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        status: response.status,
        rateLimit
      }, { status: response.status });
    }
    
    // Parse the response data
    const data = await response.json();
    
    // Return the sanitized data with rate limit info
    return NextResponse.json({
      data: sanitizeResponse(data),
      rateLimit
    });
  } catch (error) {
    console.error('Error in GitHub API proxy:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 