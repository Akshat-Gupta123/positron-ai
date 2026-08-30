import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { openRouterFetch } from "../openrouter";

type OpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
};

export default defineTool({
  name: "list_models",
  title: "List models",
  description: "List the OpenRouter models Positron can chat with, optionally filtered by name.",
  inputSchema: {
    search: z.string().trim().min(1).optional().describe("Case-insensitive filter on model id/name."),
    limit: z.number().int().min(1).max(50).optional().describe("Max models to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const res = await openRouterFetch("/models", { method: "GET" });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ToolError(`Could not load models (${res.status}): ${detail.slice(0, 300)}`);
    }

    const body = (await res.json()) as { data?: OpenRouterModel[] };
    const needle = search?.toLowerCase();
    const models = (body.data ?? [])
      .filter((m) =>
        needle ? `${m.id ?? ""} ${m.name ?? ""}`.toLowerCase().includes(needle) : true,
      )
      .slice(0, limit ?? 20)
      .map((m) => ({
        id: m.id ?? "",
        name: m.name ?? m.id ?? "",
        contextLength: m.context_length ?? null,
      }));

    const text = models.length
      ? models.map((m) => `${m.id} — ${m.name}`).join("\n")
      : "No models matched that search.";

    return { content: [{ type: "text", text }], structuredContent: { models } };
  },
});
