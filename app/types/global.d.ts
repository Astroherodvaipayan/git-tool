interface Window {
  // Environment variables exposed to the client
  GITHUB_AUTH_AVAILABLE: string;
}

// Make sure TypeScript knows this exists on the window object
declare global {
  interface Window {
    GITHUB_AUTH_AVAILABLE: string;
  }
}

export {}; 