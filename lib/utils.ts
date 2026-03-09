import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a relative file URL path to an absolute URL.
 * @param path - The relative path (e.g., "/uploads/materials/2026/03/file.pdf")
 * @returns The absolute URL (e.g., "http://localhost:3000/uploads/materials/2026/03/file.pdf")
 */
export function getAbsoluteFileUrl(path: string): string {
  if (!path) return path;
  
  // If already an absolute URL, return as is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  // Remove trailing slash from appUrl and ensure path starts with /
  const baseUrl = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
  const relativePath = path.startsWith("/") ? path : `/${path}`;
  
  return `${baseUrl}${relativePath}`;
}
