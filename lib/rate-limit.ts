import { NextRequest, NextResponse } from "next/server";

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Designed for single-instance Next.js deployments (Vercel serverless will
 * occasionally spin up multiple instances, so the limits are per-instance and
 * therefore _approximate_ in production — but they still buy a lot of
 * protection against the basic abuse cases we care about: brute force on
 * /login, scraping /forgot-password for emails, hammering AI chat).
 *
 * For stronger guarantees, swap the in-memory `Map` for an Upstash Redis
 * client (drop-in: same interface, different `store`).
 */

type Bucket = { count: number; resetAt: number };

const stores = new Map<string, Map<string, Bucket>>();

function getStore(name: string): Map<string, Bucket> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

export interface RateLimitOptions {
  /** Logical name of the limiter (e.g. "login", "ai-chat"). */
  name: string;
  /** Max number of hits within the window before the limiter starts blocking. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

/**
 * Best-effort client identifier. Order of preference:
 *   1. Forwarded headers (Vercel/Cloudflare set these).
 *   2. NextRequest.ip if the runtime exposes it.
 *   3. Fallback constant (degrades to a global limiter).
 */
export function clientIdFromRequest(req: Request | NextRequest): string {
  const headers = (req as Request).headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real;
  // Last resort. Better than nothing — at least limits one shared origin.
  return "anon";
}

/**
 * Hit the rate limiter once. The caller decides what to do with `ok=false`.
 * Use `rateLimitOrError` for the common case of returning a 429 immediately.
 */
export function hit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  const store = getStore(options.name);
  const now = Date.now();
  const bucket = store.get(identifier);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + options.windowMs;
    store.set(identifier, { count: 1, resetAt });
    // Opportunistically prune very large stores. Cheap and keeps memory bounded.
    if (store.size > 5000) {
      for (const [key, b] of store) {
        if (b.resetAt <= now) store.delete(key);
      }
    }
    return {
      ok: true,
      remaining: options.limit - 1,
      retryAfterSeconds: Math.ceil(options.windowMs / 1000),
      resetAt,
    };
  }

  if (bucket.count >= options.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      resetAt: bucket.resetAt,
    };
  }

  bucket.count += 1;
  return {
    ok: true,
    remaining: options.limit - bucket.count,
    retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    resetAt: bucket.resetAt,
  };
}

/**
 * Convenience wrapper for API routes. Returns null when allowed, or a fully
 * formed 429 NextResponse when the limit is exceeded.
 */
export function rateLimitOrError(
  identifier: string,
  options: RateLimitOptions,
): NextResponse | null {
  const result = hit(identifier, options);
  if (result.ok) return null;
  return NextResponse.json(
    {
      error: "Too many requests. Please slow down.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.floor(result.resetAt / 1000)),
      },
    },
  );
}

/**
 * Pre-baked limiters for common endpoints. Keep windows short and limits
 * permissive enough not to bother real users — the goal is to break automated
 * scripts, not annoy humans typing the wrong password.
 */
export const limiters = {
  // 10 attempts / 5 min per IP — covers login + signup combined when keyed on
  // each route name.
  login: { name: "login", limit: 10, windowMs: 5 * 60 * 1000 },
  signup: { name: "signup", limit: 5, windowMs: 60 * 60 * 1000 },
  forgotPassword: { name: "forgot-password", limit: 5, windowMs: 60 * 60 * 1000 },
  resetPassword: { name: "reset-password", limit: 10, windowMs: 60 * 60 * 1000 },
  joinOrganization: { name: "join-org", limit: 20, windowMs: 60 * 60 * 1000 },
  // AI is keyed on userId, not IP, so the limit is the actual usage budget.
  aiChat: { name: "ai-chat", limit: 60, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, RateLimitOptions>;
