import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "@/components/Chat";
import { Composer } from "@/components/Composer";
import { SettingsModal } from "@/components/SettingsModal";
import { ConversationList } from "@/components/ConversationList";
import { streamChat } from "@/lib/openrouter";
import { useAuth } from "@/lib/auth";
import {
  listMessages,
  createConversation,
  insertMessage,
  updateMessage,
  renameConversation,
} from "@/lib/conversations";
import {
  DEFAULT_MODEL,
  loadMessages,
  loadString,
  saveMessages,
  saveString,
  uid,
  type Message,
} from "@/lib/storage";
import type { DbConversation } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Positron — Personal AI Chat for OpenRouter" },
      {
        name: "description",
        content:
          "Positron is a minimal, fast personal AI chat client that talks to OpenRouter with your own API key. No backend, no accounts.",
      },
      { property: "og:title", content: "Positron — Personal AI Chat for OpenRouter" },
      {
        property: "og:description",
        content: "A minimal BYOK chat client for OpenRouter. Bring your key, pick a model, start chatting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PositronApp,
});

// ─── App ─────────────────────────────────────────────────────────────────────

function PositronApp() {
  const router = useRouter();
  const { configured, loading, user, signOut } = useAuth();

  const [model, setModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState("");
  const [ready, setReady] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeConv, setActiveConv] = useState<DbConversation | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [showSettings, setShowSettings] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingAssistantIdRef = useRef<string | null>(null);
  const lastSaveRef = useRef(0);

  // Auth guard — redirect to /auth if not logged in
  useEffect(() => {
    if (!loading && configured && !user) {
      void router.navigate({ to: "/auth" });
    }
  }, [loading, configured, user, router]);

  // Load local settings (api key, model) on mount
  useEffect(() => {
    if (!configured) {
      setModel(loadString("model", DEFAULT_MODEL) || DEFAULT_MODEL);
      setApiKey(loadString("apiKey"));
      setReady(true);
      return;
    }
    // When configured, model/apiKey come from Supabase (per-user) or fall back to localStorage
    setModel(loadString("model", DEFAULT_MODEL) || DEFAULT_MODEL);
    setApiKey(loadString("apiKey"));
    setReady(true);
  }, [configured]);

  // ─── Conversation loading ──────────────────────────────────────────────────

  const loadConversation = useCallback(async (conv: DbConversation) => {
    setActiveConv(conv);
    setMessages([]);
    setIsStreaming(false);
    abortRef.current?.abort();
    try {
      const msgs = await listMessages(conv.id);
      setMessages(msgs.map((m) => ({ id: m.id, role: m.role, content: m.content })));
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  const handleSelectConversation = useCallback(
    (conv: DbConversation) => {
      void loadConversation(conv);
    },
    [loadConversation],
  );

  const handleDeletedConversation = useCallback(
    (id: string) => {
      if (activeConv?.id === id) {
        setActiveConv(null);
        setMessages([]);
      }
    },
    [activeConv],
  );

  // ─── Send ─────────────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    if (isStreaming) return;
    const text = input.trim();
    if (!text) return;

    // Get or create active conversation
    let conv = activeConv;
    if (!conv) {
      try {
        conv = await createConversation({ title: text.slice(0, 60), model });
        setActiveConv(conv);
      } catch (err) {
        console.error("Failed to create conversation:", err);
        return;
      }
    }

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    pendingAssistantIdRef.current = assistantId;

    const history = [...messages, userMsg];
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsStreaming(true);

    // Persist user message immediately
    try {
      await insertMessage({ conversation_id: conv.id, role: "user", content: text });
    } catch (err) {
      console.error("Failed to persist user message:", err);
    }

    // Auto-rename conversation if it's the first message
    if (history.length === 1) {
      try {
        await renameConversation(conv.id, text.slice(0, 60));
        setActiveConv((prev) => (prev ? { ...prev, title: text.slice(0, 60) } : prev));
      } catch (err) {
        console.error("Failed to rename conversation:", err);
      }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    // Debounced save of assistant content (every 500ms during streaming)
    const saveAssistantContent = async (id: string, content: string) => {
      try {
        await updateMessage(id, content);
      } catch (err) {
        console.error("Failed to update assistant message:", err);
      }
    };

    let lastSavedContent = "";

    void streamChat({
      messages: history.map(({ role, content }) => ({ role, content })),
      apiKey,
      model,
      signal: controller.signal,
      onChunk: (delta) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta } : m,
          ),
        );
        // Debounce save
        lastSavedContent += delta;
        const now = Date.now();
        if (now - lastSaveRef.current > 500) {
          lastSaveRef.current = now;
          void saveAssistantContent(assistantId, lastSavedContent);
        }
      },
      onDone: () => {
        setIsStreaming(false);
        // Final save
        void saveAssistantContent(assistantId, lastSavedContent);
        pendingAssistantIdRef.current = null;
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${err}` } : m,
          ),
        );
        setIsStreaming(false);
        pendingAssistantIdRef.current = null;
      },
    });
  }, [isStreaming, input, activeConv, messages, apiKey, model]);

  // ─── New chat ─────────────────────────────────────────────────────────────

  const handleNewChat = useCallback(async () => {
    if (isStreaming) {
      abortRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveConv(null);
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  }, [isStreaming]);

  // ─── Suggestions ───────────────────────────────────────────────────────────

  const pickSuggestion = (text: string) => {
    setInput(text);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
      });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  // Loading auth state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0d10]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#34343f] border-t-[#00d9ff]" />
      </div>
    );
  }

  // Supabase not configured — show localStorage-only fallback (backward compat)
  if (!configured || !user) {
    return <UnauthenticatedApp />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d10] text-[#e8e8ee]">
      {/* Sidebar */}
      <aside
        className="flex shrink-0 flex-col border-r border-[#2a2a33] bg-[#0d0d10] transition-all duration-200"
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : "0px", overflow: "hidden" }}
      >
        <ConversationList
          activeId={activeConv?.id ?? null}
          onSelect={handleSelectConversation}
          onNew={handleNewChat}
          onDeleted={handleDeletedConversation}
        />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2a2a33] bg-[#0d0d10] px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-[#9a9aa8] transition-colors hover:bg-[#15151a] hover:text-[#e8e8ee]"
              title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>

            <span
              className="text-xl font-semibold italic text-[#00d9ff]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              e
            </span>
            <span className="font-medium text-white">Positron</span>
            {activeConv && (
              <span className="ml-2 truncate text-sm text-[#9a9aa8]">/ {activeConv.title}</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#9a9aa8] transition-colors hover:bg-[#15151a] hover:text-[#e8e8ee]"
            >
              <Plus size={15} className="text-[#ff5ea8]" />
              New
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#9a9aa8] transition-colors hover:bg-[#15151a] hover:text-[#e8e8ee]"
            >
              <Settings size={15} />
              Settings
            </button>
          </div>
        </header>

        {/* Chat thread */}
        <Chat messages={messages} isStreaming={isStreaming} onPickSuggestion={pickSuggestion} />

        {/* Composer */}
        <Composer
          input={input}
          setInput={setInput}
          onSend={send}
          disabled={isStreaming}
          model={model}
          textareaRef={textareaRef}
        />
      </div>

      {/* Settings modal */}
      <SettingsModal
        open={showSettings}
        apiKey={apiKey}
        model={model}
        warn={!apiKey}
        onClose={() => setShowSettings(false)}
        onSave={(k, m) => {
          setApiKey(k);
          setModel(m);
        }}
        onSignOut={async () => {
          await signOut();
          setShowSettings(false);
          void router.navigate({ to: "/auth" });
        }}
        {...(user.email ? { userEmail: user.email } : {})}
      />
    </div>
  );
}

// ─── Unauthenticated / localStorage-only fallback ─────────────────────────────
// Shown when Supabase is not configured, or when user is not signed in.
// Keeps the existing single-column layout so nothing breaks.

function UnauthenticatedApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState("");
  const [ready, setReady] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMessages(loadMessages());
    setModel(loadString("model", DEFAULT_MODEL) || DEFAULT_MODEL);
    setApiKey(loadString("apiKey"));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveMessages(messages);
  }, [messages, ready]);

  useEffect(() => {
    if (ready) saveString("model", model);
  }, [model, ready]);

  useEffect(() => {
    if (ready) saveString("apiKey", apiKey);
  }, [apiKey, ready]);

  const send = useCallback(() => {
    if (isStreaming) return;
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: uid(), role: "user", content: text };
    const assistantId = uid();
    const history = [...messages, userMsg];
    setMessages([...history, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    void streamChat({
      messages: history.map(({ role, content }) => ({ role, content })),
      apiKey,
      model,
      signal: controller.signal,
      onChunk: (delta) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + delta } : m)),
        ),
      onDone: () => setIsStreaming(false),
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: `Error: ${err}` } : m)),
        );
        setIsStreaming(false);
      },
    });
  }, [apiKey, input, isStreaming, messages, model]);

  const newChat = () => {
    if (isStreaming) {
      abortRef.current?.abort();
      setIsStreaming(false);
    }
    if (messages.length > 0 && !window.confirm("Clear this conversation?")) return;
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  const pickSuggestion = (text: string) => {
    setInput(text);
    const el = textareaRef.current;
    if (el) {
      el.focus();
      requestAnimationFrame(() => {
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 200) + "px";
      });
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#0d0d10] text-[#e8e8ee]">
      <div className="mx-auto flex h-full w-full max-w-[820px] flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#2a2a33] bg-[#0d0d10] px-5">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl font-semibold italic text-[#00d9ff]"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              e
            </span>
            <span className="font-medium text-white">Positron</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={newChat}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#9a9aa8] transition-colors hover:bg-[#15151a] hover:text-[#e8e8ee]"
            >
              <Plus size={15} className="text-[#ff5ea8]" />
              New
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#9a9aa8] transition-colors hover:bg-[#15151a] hover:text-[#e8e8ee]"
            >
              <Settings size={15} />
              Settings
            </button>
          </div>
        </header>

        <Chat messages={messages} isStreaming={isStreaming} onPickSuggestion={pickSuggestion} />

        <Composer
          input={input}
          setInput={setInput}
          onSend={send}
          disabled={isStreaming}
          model={model}
          textareaRef={textareaRef}
        />
      </div>

      <SettingsModal
        open={showSettings}
        apiKey={apiKey}
        model={model}
        warn={!apiKey}
        onClose={() => setShowSettings(false)}
        onSave={(k, m) => {
          setApiKey(k);
          setModel(m);
          setShowSettings(false);
        }}
      />
    </div>
  );
}
