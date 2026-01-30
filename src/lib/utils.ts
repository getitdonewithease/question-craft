import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets the access token from localStorage or environment variable
 * Returns null if token is not found or expired
 */
export function getAccessToken(): string | null {
  // Try multiple common localStorage keys
  const possibleKeys = [
    "authData",
    "auth",
    "token",
    "accessToken",
    "authToken",
    "userToken",
  ];

  for (const key of possibleKeys) {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) continue;

      // Try parsing as JSON first (for objects with accessToken property)
      try {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken && typeof parsed.accessToken === "string") {
          // Check if token is expired
          if (parsed.expirationTime) {
            const expiration = new Date(parsed.expirationTime);
            if (expiration > new Date()) {
              return parsed.accessToken;
            }
            // Token expired, remove it
            localStorage.removeItem(key);
            continue;
          } else {
            return parsed.accessToken;
          }
        }
      } catch {
        // If not JSON, treat as direct token string
        if (typeof stored === "string" && stored.length > 0) {
          return stored;
        }
      }
    } catch (error) {
      // Continue to next key
      continue;
    }
  }

  // Fallback to environment variable
  const envToken = import.meta.env.VITE_ACCESS_TOKEN;
  if (envToken) {
    return envToken;
  }

  return null;
}

/**
 * Sets the access token in localStorage
 * @param token - The access token string
 * @param expirationTime - Optional expiration time (ISO string)
 */
export function setAccessToken(token: string, expirationTime?: string): void {
  if (expirationTime) {
    localStorage.setItem(
      "authData",
      JSON.stringify({
        accessToken: token,
        expirationTime: expirationTime,
      })
    );
  } else {
    localStorage.setItem("accessToken", token);
  }
}

// Expose setAccessToken to window for easy console access
if (typeof window !== "undefined") {
  (window as any).setAccessToken = setAccessToken;
}