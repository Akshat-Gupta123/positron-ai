import { getSupabase } from "./supabase";
import type { DbConversation, DbMessage } from "./supabase";

// Conversations ------------------------------------------------------------

export async function listConversations(): Promise<DbConversation[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbConversation[];
}

export async function createConversation(opts: {
  title?: string;
  model?: string;
}): Promise<DbConversation> {
  const supabase = getSupabase();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("conversations")
    .insert({
      user_id: user.user.id,
      title: opts.title ?? "New chat",
      model: opts.model ?? "openrouter/free",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DbConversation;
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("conversations").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string): Promise<void> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("conversations").delete().eq("id", id);
  if (error) throw error;
}

// Messages -----------------------------------------------------------------

export async function listMessages(conversationId: string): Promise<DbMessage[]> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbMessage[];
}

export async function insertMessage(opts: {
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  meta?: Record<string, unknown> | null;
}): Promise<DbMessage> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("messages")
    .insert({
      conversation_id: opts.conversation_id,
      role: opts.role,
      content: opts.content,
      meta: opts.meta ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as DbMessage;
}

export async function updateMessage(id: string, content: string): Promise<void> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("messages").update({ content }).eq("id", id);
  if (error) throw error;
}
