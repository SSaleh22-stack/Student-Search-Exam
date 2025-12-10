import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parse JSON response, handling cases where response might not be JSON
 */
export async function safeJsonParse<T = any>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type");
  
  // Check if response is JSON
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 100)}`);
  }
  
  try {
    return await response.json();
  } catch (err) {
    if (err instanceof SyntaxError) {
      const text = await response.text();
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }
    throw err;
  }
}



