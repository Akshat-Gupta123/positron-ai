import { auth, defineMcp } from "@lovable.dev/mcp-js";
import askPositron from "./tools/ask-positron";
import listModels from "./tools/list-models";

// The OAuth issuer must be the direct Supabase host, which survives publish.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "positron-chat-companion",
  title: "Positron Chat Companion",
  version: "0.1.0",
  instructions:
    "Tools for Positron, a personal AI chat client backed by OpenRouter. Use `list_models` to discover available models and `ask_positron` to run a prompt through one.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [askPositron, listModels],
});
