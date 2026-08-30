import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear } from "date-fns";
import { Plus, Trash2, MessageSquare, Search, X } from "lucide-react";
import {
  listConversations,
  createConversation,
  deleteConversation,
  renameConversation,
} from "@/lib/conversations";
import type { DbConversation } from "@/lib/supabase";

type Props = {
  activeId: string | null;
  onSelect: (conv: DbConversation) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
};

type Group = { label: string; conversations: DbConversation[] };

function groupByDate(conversations: DbConversation[]): Group[] {
  const groups: Record<string, DbConversation[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    "This year": [],
    Older: [],
  };

  for (const c of conversations) {
    const d = new Date(c.updated_at);
    if (isToday(d)) groups["Today"]!.push(c);
    else if (isYesterday(d)) groups["Yesterday"]!.push(c);
    else if (isThisWeek(d)) groups["This week"]!.push(c);
    else if (isThisYear(d)) groups["This year"]!.push(c);
    else groups["Older"]!.push(c);
  }

  return Object.entries(groups)
    .filter(([, cs]) => cs.length > 0)
    .map(([label, cs]) => ({ label, conversations: cs }));
}

export function ConversationList({ activeId, onSelect, onNew, onDeleted }: Props) {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const data = await listConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Re-fetch on new conversation creation
  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("positron:conversations-changed", handler);
    return () => window.removeEventListener("positron:conversations-changed", handler);
  }, []);

  const handleNew = async () => {
    try {
      const conv = await createConversation({ title: "New chat" });
      setConversations((prev) => [conv, ...prev]);
      window.dispatchEvent(new CustomEvent("positron:conversations-changed"));
      onNew();
      onSelect(conv);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      onDeleted(id);
      window.dispatchEvent(new CustomEvent("positron:conversations-changed"));
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.model.toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a33] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-[#9a9aa8]">
            Conversations
          </span>
          {conversations.length > 0 && (
            <span className="rounded-full bg-[#2a2a33] px-1.5 py-0.5 text-[10px] tabular-nums text-[#9a9aa8]">
              {conversations.length}
            </span>
          )}
        </div>
        <button
          onClick={handleNew}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#9a9aa8] transition-all duration-150 hover:bg-[#15151a] hover:text-[#00d9ff] active:scale-95"
          title="New conversation"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Search */}
      {conversations.length > 3 && (
        <div className="px-3 py-2">
          <div className="relative">
            <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9a9aa8]/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-md border border-[#2a2a33] bg-[#0d0d10] py-1.5 pl-7 pr-7 text-[11px] text-[#e8e8ee] outline-none placeholder:text-[#9a9aa8]/40 focus:border-[#34343f]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9a9aa8]/50 hover:text-[#e8e8ee]"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#34343f] border-t-[#00d9ff]" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#15151a]">
            <MessageSquare size={20} className="text-[#34343f]" />
          </div>
          <p className="mt-3 text-xs text-[#9a9aa8]">No conversations yet.</p>
          <p className="mt-1 text-[10px] text-[#9a9aa8]/50">Start a chat to see it here.</p>
          <button
            onClick={handleNew}
            className="mt-4 rounded-lg bg-[#00d9ff] px-3 py-1.5 text-xs font-semibold text-[#0d0d10] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            Start a chat
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {grouped.map((group) => (
            <div key={group.label}>
              <div className="sticky top-0 z-[1] bg-[#0d0d10]/95 px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#9a9aa8]/50 backdrop-blur-sm">
                {group.label}
              </div>
              {group.conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => onSelect(conv)}
                  className={`group flex cursor-pointer items-center gap-2 border-b border-[#2a2a33]/40 px-4 py-2.5 transition-all duration-150 ${
                    activeId === conv.id
                      ? "bg-[#15151a]"
                      : "hover:bg-[#15151a]/60"
                  }`}
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      activeId === conv.id
                        ? "bg-[#00d9ff]/15 text-[#00d9ff]"
                        : "bg-[#1a1a20] text-[#9a9aa8]"
                    }`}
                  >
                    <MessageSquare size={11} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[13px] ${
                        activeId === conv.id ? "text-[#e8e8ee] font-medium" : "text-[#e8e8ee]/80"
                      }`}
                      title={conv.title}
                    >
                      {conv.title}
                    </p>
                    <p className="truncate text-[10px] text-[#9a9aa8]/60">
                      {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => void handleDelete(e, conv.id)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#9a9aa8] opacity-0 transition-all duration-150 hover:bg-[#2a2a33] hover:text-red-400 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
