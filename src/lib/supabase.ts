import { createClient } from "@supabase/supabase-js";

// External Supabase project used for Positron auth + chat history.
// Publishable keys are safe to ship in client code.
const SUPABASE_URL =
  (import.meta.env["VITE_APP_SUPABASE_URL"] as string | undefined) ??
  "https://sviwdtfgyeposijmekby.supabase.co";
const SUPABASE_ANON_KEY =
  (import.meta.env["VITE_APP_SUPABASE_ANON_KEY"] as string | undefined) ??
  "sb_publishable_DzNif9vzJ2WIm7Lcj7bvVQ_7zG0aZAF";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);


// Database types — matches the schema in schema.sql
export type DbConversation = {
  id: string;
  user_id: string;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
};

export type DbMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

// Lazy client: created on first use. Untyped to avoid generic-param conflicts with
// @supabase/supabase-js v2. Return values are cast explicitly in conversations.ts.
let _client: ReturnType<typeof createClient> | null = null;
export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    });
  }
  return _client;
}
