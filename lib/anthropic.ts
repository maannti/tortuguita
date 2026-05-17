import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-3-5-haiku-20241022";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY environment variable");
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
