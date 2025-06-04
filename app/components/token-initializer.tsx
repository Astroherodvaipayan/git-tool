"use client";

import { useEffect, useState } from "react";

// This component is responsible for initializing the GitHub token from session storage
// It should be added near the root of the application
export function TokenInitializer() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeToken = async () => {
      try {
        console.log("TokenInitializer: Checking for token in session storage");
        
        // Check if token exists in session storage - use consistent key name
        const token = sessionStorage.getItem("github-token");
        if (!token) {
          console.log("TokenInitializer: No token found in session storage");
          setInitialized(true);
          return;
        }
        
        console.log("TokenInitializer: Token found, applying");
        // Apply token via API
        const response = await fetch("/api/set-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error("TokenInitializer: Failed to apply token:", errorData.error);
        } else {
          console.log("TokenInitializer: Token applied successfully");
        }
      } catch (error) {
        // Log error but don't block rendering
        console.error("TokenInitializer: Error during initialization:", error);
      } finally {
        // Always mark as initialized to prevent blocking the app
        setInitialized(true);
      }
    };
    
    // Don't run on the server
    if (typeof window !== 'undefined') {
      initializeToken();
    } else {
      setInitialized(true);
    }
  }, []);
  
  // Return null as this is a utility component with no UI
  return null;
} 