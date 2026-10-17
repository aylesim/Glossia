import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/llm/types";

type Bucket = { count: number; resetAt: number };

const globalLimiter = globalThis as typeof globalThis & {
  __glossiaRateLimits?: Map<string, Bucket>;
};
const buckets = globalLimiter.__glossiaRateLimits ?? new Map<string, Bucket>();
globalLimiter.__glossiaRateLimits = buckets;

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/**
 * Small fixed-window limiter for the expensive routes. This is a POC guard,
 * not a distributed rate limiter: for multi-instance deployments use Redis or
 * the platform's edge limiter.
 */
export function enforceRateLimit(
  request: NextRequest,
  name: string,
  limit: number,
  windowMs: number,
): void {
  const key = `${name}:${clientKey(request)}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > limit) {
    const seconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    throw new AppError("RATE_LIMITED", `Too many ${name} requests.`, {
      status: 429,
      hint: `Try again in ${seconds}s.`,
    });
  }
}
