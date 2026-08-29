import type { Role } from "./storage";

export async function streamChat(opts: {
  messages: { role: Role; content: string }[];
  apiKey: string;
  model: string;
  onChunk: (delta: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const { messages, apiKey, model, onChunk, onDone, onError, signal } = opts;

  let res: Response;
  try {
    res = apiKey
      ? await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          ...(signal ? { signal } : {}),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "",
            "X-Title": "Positron",
          },
          body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
        })
      : await fetch("/api/chat", {
          method: "POST",
          ...(signal ? { signal } : {}),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages }),
        });
  } catch (e) {
    if (signal?.aborted) return;
    onError(e instanceof Error ? e.message : "Network error");
    return;
  }


  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    onError(`${res.status} ${res.statusText} — ${body.slice(0, 200)}`);
    return;
  }

  if (!res.body) {
    onError("No response body");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      if (signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        return;
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        for (const line of part.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            onDone();
            return;
          }
          try {
            const json = JSON.parse(data);
            const delta: string | undefined = json?.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
          } catch {
            /* ignore malformed chunk */
          }
        }
      }
    }
    onDone();
  } catch (e) {
    if (signal?.aborted) return;
    onError(e instanceof Error ? e.message : "Stream error");
  }
}
