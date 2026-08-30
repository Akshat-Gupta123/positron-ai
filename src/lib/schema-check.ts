// Runtime sanity check that the connected Supabase project has the schema we expect.
// Call from the browser console: `import("/src/lib/schema-check.ts").then(m => m.checkSchema())`
// Or programmatically from anywhere with a Supabase client.

import { getSupabase } from "./supabase";

export type SchemaCheckResult = {
  ok: boolean;
  tables: { conversations: boolean; messages: boolean };
  indexes: { messages_conv_idx: boolean; conversations_user_idx: boolean };
  policies: { conversations: number; messages: number };
  rls: { conversations: boolean; messages: boolean };
  errors: string[];
};

const EXPECTED_POLICIES_PER_TABLE = 4; // select, insert, update, delete

// Read-only checks against Postgres information_schema + pg_catalog.
// Uses the Supabase client's rpc() with a SECURITY DEFINER-ish fallback:
// we just query public.pg_policies, pg_indexes, pg_tables — all readable by
// any authenticated or anon role.
export async function checkSchema(): Promise<SchemaCheckResult> {
  const result: SchemaCheckResult = {
    ok: true,
    tables: { conversations: false, messages: false },
    indexes: { messages_conv_idx: false, conversations_user_idx: false },
    policies: { conversations: 0, messages: 0 },
    rls: { conversations: false, messages: false },
    errors: [],
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabase() as any;

  // 1. Tables
  const { data: tables, error: tablesErr } = await supabase
    .from("pg_tables")
    .select("tablename, rowsecurity")
    .eq("schemaname", "public")
    .in("tablename", ["conversations", "messages"]);
  if (tablesErr) {
    result.errors.push(`pg_tables: ${tablesErr.message}`);
    result.ok = false;
  } else {
    for (const t of tables ?? []) {
      if (t.tablename === "conversations") {
        result.tables.conversations = true;
        result.rls.conversations = !!t.rowsecurity;
      }
      if (t.tablename === "messages") {
        result.tables.messages = true;
        result.rls.messages = !!t.rowsecurity;
      }
    }
  }

  // 2. Indexes
  const { data: indexes, error: idxErr } = await supabase
    .from("pg_indexes")
    .select("indexname, tablename")
    .eq("schemaname", "public")
    .in("indexname", ["messages_conv_idx", "conversations_user_idx"]);
  if (idxErr) {
    result.errors.push(`pg_indexes: ${idxErr.message}`);
    result.ok = false;
  } else {
    for (const i of indexes ?? []) {
      if (i.indexname === "messages_conv_idx") result.indexes.messages_conv_idx = true;
      if (i.indexname === "conversations_user_idx") result.indexes.conversations_user_idx = true;
    }
  }

  // 3. Policies (counts per table)
  const { data: policies, error: polErr } = await supabase
    .from("pg_policies")
    .select("tablename")
    .in("tablename", ["conversations", "messages"]);
  if (polErr) {
    result.errors.push(`pg_policies: ${polErr.message}`);
    result.ok = false;
  } else {
    for (const p of policies ?? []) {
      if (p.tablename === "conversations") result.policies.conversations++;
      if (p.tablename === "messages") result.policies.messages++;
    }
  }

  // Aggregate
  if (!result.tables.conversations || !result.tables.messages) result.ok = false;
  if (!result.indexes.messages_conv_idx || !result.indexes.conversations_user_idx) result.ok = false;
  if (!result.rls.conversations || !result.rls.messages) result.ok = false;
  if (
    result.policies.conversations < EXPECTED_POLICIES_PER_TABLE ||
    result.policies.messages < EXPECTED_POLICIES_PER_TABLE
  ) {
    result.ok = false;
  }

  return result;
}

export function formatSchemaCheck(r: SchemaCheckResult): string {
  const lines: string[] = [];
  const ok = (b: boolean) => (b ? "✓" : "✗");
  const num = (n: number) => `${n}/${EXPECTED_POLICIES_PER_TABLE}`;

  lines.push(`Schema check: ${r.ok ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push(`Tables`);
  lines.push(`  ${ok(r.tables.conversations)} conversations`);
  lines.push(`  ${ok(r.tables.messages)} messages`);
  lines.push("");
  lines.push(`RLS enabled`);
  lines.push(`  ${ok(r.rls.conversations)} conversations`);
  lines.push(`  ${ok(r.rls.messages)} messages`);
  lines.push("");
  lines.push(`Indexes`);
  lines.push(`  ${ok(r.indexes.messages_conv_idx)} messages_conv_idx`);
  lines.push(`  ${ok(r.indexes.conversations_user_idx)} conversations_user_idx`);
  lines.push("");
  lines.push(`Policies (select/insert/update/delete)`);
  lines.push(`  ${ok(r.policies.conversations >= EXPECTED_POLICIES_PER_TABLE)} conversations: ${num(r.policies.conversations)}`);
  lines.push(`  ${ok(r.policies.messages >= EXPECTED_POLICIES_PER_TABLE)} messages: ${num(r.policies.messages)}`);

  if (r.errors.length > 0) {
    lines.push("");
    lines.push(`Errors:`);
    for (const e of r.errors) lines.push(`  - ${e}`);
  }

  return lines.join("\n");
}
