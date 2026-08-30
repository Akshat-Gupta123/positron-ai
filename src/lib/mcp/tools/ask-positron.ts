import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { openRouterFetch } from "../openrouter";

export default defineTool({
  name: "ask_positron",
  title: "Ask Positron",
  description:
    "Send a prompt to Positron and get a completion back from the chosen OpenRouter model.",
  inputSchema: {
    prompt: z.string().trim().min(1).describe("The question or instruction to send."),
    model: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("OpenRouter model id, e.g. 'openrouter/free'. Defaults to 'openrouter/free'."),
    system: z.string().trim().min(1).optional().describe("Optional system instruction."),
  },
  outputSchema: { text: z.string(), model: z.string() },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  handler: async ({ prompt, model, system }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }

    const messages = [
      ...(system ? [{ role: "system", content: system }] : []),
      { role: "user", content: prompt },
    ];

    const res = await openRouterFetch("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model: model || "openrouter/free",
        messages,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ToolError(`OpenRouter request failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      model?: string;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ToolError("The model returned an empty response.");

    return {
      content: [{ type: "text", text }],
      structuredContent: { text, model: data.model ?? model ?? "openrouter/free" },
    };
  },
});
