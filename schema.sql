-- Positron: Supabase schema
-- Run this in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- Conversations
create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'New chat',
  model       text not null default 'openrouter/free',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Messages
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  meta            jsonb,
  created_at      timestamptz not null default now()
);

-- Indexes
create index if not exists messages_conv_idx
  on public.messages (conversation_id, created_at);

create index if not exists conversations_user_idx
  on public.conversations (user_id, updated_at desc);

-- ── Row-Level Security ──────────────────────────────────────────────────────────

alter table public.conversations enable row level security;
alter table public.messages     enable row level security;

-- Conversations
create policy "users_read_own_conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "users_insert_own_conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "users_update_own_conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "users_delete_own_conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Messages
create policy "users_read_own_messages"
  on public.messages for select
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

create policy "users_insert_own_messages"
  on public.messages for insert
  with check (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

create policy "users_update_own_messages"
  on public.messages for update
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

create policy "users_delete_own_messages"
  on public.messages for delete
  using (
    conversation_id in (
      select id from public.conversations where user_id = auth.uid()
    )
  );

-- Auto-update updated_at on conversation changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists conversations_set_updated_at
  on public.conversations;

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();
