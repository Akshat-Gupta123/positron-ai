export type Role = "user" | "assistant" | "system";
export type Message = { id: string; role: Role; content: string };

const KEYS = {
  apiKey: "positron.apiKey",
  model: "positron.model",
  messages: "positron.messages",
} as const;

const canUse = () => typeof window !== "undefined" && !!window.localStorage;

export function loadString(key: keyof typeof KEYS, fallback = ""): string {
  if (!canUse()) return fallback;
  try {
    return window.localStorage.getItem(KEYS[key]) ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveString(key: keyof typeof KEYS, value: string): void {
  if (!canUse()) return;
  try {
    window.localStorage.setItem(KEYS[key], value);
  } catch {
    /* ignore */
  }
}

export function loadMessages(): Message[] {
  if (!canUse()) return [];
  try {
    const raw = window.localStorage.getItem(KEYS.messages);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message =>
        !!m && typeof m.id === "string" && typeof m.content === "string" && typeof m.role === "string",
    );
  } catch {
    return [];
  }
}

export function saveMessages(messages: Message[]): void {
  if (!canUse()) return;
  try {
    window.localStorage.setItem(KEYS.messages, JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

export const DEFAULT_MODEL = "openrouter/free";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
