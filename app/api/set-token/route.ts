import { NextRequest, NextResponse } from 'next/server';
import { updateGitHubToken, isAuthenticated, getRateLimit } from '@/app/lib/github';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Get the token from the request
    let token = data.token;
    
    // Special case for ENV_TOKEN - fetch from environment variable
    if (token === "ENV_TOKEN") {
      const envToken = process.env.GITHUB_TOKEN;
      if (!envToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'No token found in environment variables' 
        }, { status: 400 });
      }
      
      // Check if the token is the placeholder from the .env.local file
      if (envToken === "your_personal_access_token_here") {
        return NextResponse.json({ 
          success: false, 
          error: 'The token in .env.local is still the placeholder value. Please replace it with your actual GitHub token.' 
        }, { status: 400 });
      }
      
      token = envToken;
    }
    
    // Validate the token format - GitHub tokens are 40 characters long 
    // or use the newer format starting with "ghp_" (GitHub Personal)
    if (!token || (
      typeof token !== 'string' || 
      (token.length !== 40 && !token.startsWith('ghp_'))
    )) {
      let errorMessage = 'Invalid token format';
      
      // Give more descriptive error for common issues
      if (token === "your_personal_access_token_here") {
        errorMessage = 'Please replace the placeholder with your actual GitHub token';
      } else if (!token) {
        errorMessage = 'Token is empty';
      } else if (token.length < 10) {
        errorMessage = 'Token is too short - GitHub tokens are 40 characters or start with ghp_';
      }
      
      return NextResponse.json({ 
        success: false, 
        error: errorMessage
      }, { status: 400 });
    }
    
    // Update the token in the GitHub client
    const authenticated = updateGitHubToken(token);
    
    if (!authenticated) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to apply token - the token may be invalid or revoked' 
      }, { status: 500 });
    }
    
    // Get the rate limit to verify the token works
    let rateLimit;
    try {
      rateLimit = await getRateLimit();
      
      // Verify that the rate limit shows we're authenticated
      if (!rateLimit.isAuthenticated || rateLimit.limit <= 60) {
        throw new Error('Token did not increase API rate limit');
      }
      
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Token verification failed - the token may be invalid or GitHub API may be unavailable' 
      }, { status: 500 });
    }
    
    // Return success with the new rate limit
    return NextResponse.json({
      success: true,
      authenticated: true,
      rateLimit
    });
  } catch (error) {
    console.error('Error processing token:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process token - please check the token format and try again' 
    }, { status: 500 });
  }
} 