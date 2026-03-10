import { unstable_cache } from "next/cache";
import { cache } from "react";

/**
 * Creates a cached version of a function with revalidation tag.
 * @param fn - The function to cache
 * @param tags - Revalidation tags for on-demand revalidation
 * @param expire - Optional cache expiration in seconds (default: 60s)
 */
export function createCachedFn<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  tags: string[],
  expire: number = 60
) {
  return cache(unstable_cache(fn, tags, { revalidate: expire }));
}

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIG = {
  // Short cache for frequently changing data
  SHORT: 30, // 30 seconds
  // Medium cache for moderately changing data
  MEDIUM: 300, // 5 minutes
  // Long cache for static data
  LONG: 3600, // 1 hour
  // Very long cache for rarely changing data
  VERY_LONG: 86400, // 24 hours
} as const;

/**
 * Revalidation tags for different data types
 */
export const REVALIDATION_TAGS = {
  CLASSES: "classes",
  MATERIALS: "materials",
  ASSIGNMENTS: "assignments",
  SUBMISSIONS: "submissions",
  USERS: "users",
  MEETINGS: "meetings",
} as const;
