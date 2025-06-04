import { NextResponse } from 'next/server';
import { getRateLimit, isAuthenticated } from '@/app/lib/github';
import { rateLimitCache } from '@/app/lib/cache';

// Define an interface for the rate limit data structure
interface RateLimitData {
  limit: number;
  remaining: number;
  reset: number;
  isAuthenticated: boolean;
  timestamp?: number;
}

export async function GET() {
  // Check if we have a valid cache
  const cacheKey = 'rate-limit';
  const cachedData = rateLimitCache.get(cacheKey) as RateLimitData | undefined;
  
  if (cachedData) {
    console.log('Using cached rate limit data');
    return NextResponse.json({
      ...cachedData,
      cached: true,
      cachedAt: cachedData.timestamp 
        ? new Date(cachedData.timestamp).toISOString() 
        : new Date().toISOString(),
    });
  }

  try {
    const rateLimit = await getRateLimit();
    
    // Update cache
    rateLimitCache.set(cacheKey, {
      ...rateLimit,
      timestamp: Date.now()
    } as RateLimitData);
    
    return NextResponse.json({
      ...rateLimit,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching rate limit:', error);
    
    // No cache available, return fallback values
    return NextResponse.json(
      { 
        error: 'Failed to fetch rate limit information',
        // Fallback values
        limit: isAuthenticated() ? 5000 : 60,
        remaining: Math.floor((isAuthenticated() ? 5000 : 60) * 0.9), // Assume 90% remaining
        reset: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        isAuthenticated: isAuthenticated(),
      }, 
      { status: 500 }
    );
  }
} 