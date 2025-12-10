import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse JSON response, handling cases where response might not be JSON
 * Returns the response as a string if it's not JSON, or as parsed JSON if it is
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T | string> {
  const contentType = response.headers.get("content-type");
  
  // If response is not JSON, return as text
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    // Return as string so caller can handle it
    return text as any;
  }
  
  try {
    return await response.json();
  } catch (err) {
    // If JSON parsing fails, try to get text
    if (err instanceof SyntaxError) {
      try {
        const text = await response.text();
        return text as any;
      } catch {
        // If we can't get text either, return the error message
        return `Invalid JSON response: ${err instanceof Error ? err.message : 'Unknown error'}` as any;
      }
    }
    throw err;
  }
}



