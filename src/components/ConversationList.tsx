import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Plus, Trash2, MessageSquare } from "lucide-react";
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

export function ConversationList({ activeId, onSelect, onNew, onDeleted }: Props) {
  const [conversations, setConversations] = useState<DbConversation[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleNew = async () => {
    try {
      const conv = await createConversation({ title: "New chat" });
      setConversations((prev) => [conv, ...prev]);
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
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#34343f] border-t-[#00d9ff]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a33] px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-[#9a9aa8]">
          Conversations
        </span>
        <button
          onClick={handleNew}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#9a9aa8] transition-colors hover:bg-[#15151a] hover:text-[#00d9ff]"
          title="New conversation"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* List */}
      {conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
          <MessageSquare size={24} className="text-[#2a2a33]" />
          <p className="mt-2 text-xs text-[#9a9aa8]">No conversations yet.</p>
          <button
            onClick={handleNew}
            className="mt-3 rounded-lg bg-[#00d9ff] px-3 py-1.5 text-xs font-semibold text-[#0d0d10] hover:brightness-110"
          >
            Start a chat
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`group flex cursor-pointer items-center gap-2 border-b border-[#2a2a33] px-4 py-3 transition-colors hover:bg-[#15151a] ${
                activeId === conv.id ? "bg-[#15151a]" : ""
              }`}
            >
              <MessageSquare size={13} className="shrink-0 text-[#9a9aa8]" />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm text-[#e8e8ee]"
                  title={conv.title}
                >
                  {conv.title}
                </p>
                <p className="text-[10px] text-[#9a9aa8]">
                  {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={(e) => void handleDelete(e, conv.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#9a9aa8] opacity-0 transition-all hover:bg-[#2a2a33] hover:text-red-400 group-hover:opacity-100"
                title="Delete conversation"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
