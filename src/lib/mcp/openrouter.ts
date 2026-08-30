import { ToolError } from "@lovable.dev/mcp-js";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

export function openRouterKey(): string {
  const runtime = globalThis as RuntimeGlobals;
  const key = runtime.process?.env?.["OPENROUTER_API_KEY"]?.trim();
  if (!key) throw new ToolError("OPENROUTER_API_KEY is not configured on the server.");
  return key;
}

export async function openRouterFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${openRouterKey()}`);
  headers.set("Content-Type", "application/json");
  headers.set("X-Title", "Positron");
  return fetch(`https://openrouter.ai/api/v1${path}`, { ...init, headers });
}
