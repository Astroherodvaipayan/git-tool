import { NextResponse } from 'next/server';

export async function GET() {
  // This endpoint helps diagnose if the GitHub token is being loaded correctly
  // from environment variables - specifically useful for server-side
  const token = process.env.GITHUB_TOKEN;
  
  return NextResponse.json({
    tokenFound: !!token,
    tokenLength: token ? token.length : 0,
    // Don't include the actual token value for security reasons
    tokenPattern: token ? 
      (token.startsWith('ghp_') ? 'ghp_***' : '***') : 
      null,
    nodeEnv: process.env.NODE_ENV
  });
} 