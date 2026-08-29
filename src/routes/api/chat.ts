import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["OPENROUTER_API_KEY"];
        if (!apiKey) {
          return new Response("Server API key not configured", { status: 500 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        const { messages, model } = (body ?? {}) as {
          messages?: { role: string; content: string }[];
          model?: string;
        };

        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("messages is required", { status: 400 });
        }

        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "X-Title": "Positron",
          },
          body: JSON.stringify({
            model: model || "openrouter/free",
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: true,
            temperature: 0.7,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text.slice(0, 500) || "Upstream error", {
            status: upstream.status || 502,
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
