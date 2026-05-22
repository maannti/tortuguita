import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

export const MODEL = "claude-haiku-4-5-20251001";

/** Read ANTHROPIC_API_KEY from process.env, falling back to .env.local / .env files.
 *  This is needed because when Next.js runs inside an environment that already has
 *  ANTHROPIC_API_KEY="" (e.g. a Claude Code shell), @next/env won't override it.
 */
function resolveApiKey(): string {
  const fromEnv = process.env.ANTHROPIC_API_KEY;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  // Fallback: read directly from .env.local or .env
  const cwd = process.cwd();
  for (const filename of [".env.local", ".env"]) {
    try {
      const content = fs.readFileSync(path.join(cwd, filename), "utf8");
      const match = content.match(/^ANTHROPIC_API_KEY\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match?.[1]?.trim()) return match[1].trim();
    } catch {
      // file doesn't exist, try next
    }
  }

  throw new Error("Missing ANTHROPIC_API_KEY — set it in .env.local or Vercel environment variables");
}

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = resolveApiKey();
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

// Backward-compat export — evaluated lazily via Proxy
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return (getAnthropic() as any)[prop];
  },
});
