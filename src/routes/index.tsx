import { createFileRoute } from "@tanstack/react-router";
import { Plus, Settings } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chat } from "@/components/Chat";
import { Composer } from "@/components/Composer";
import { SettingsModal } from "@/components/SettingsModal";
import { streamChat } from "@/lib/openrouter";
import {
  DEFAULT_MODEL,
  loadMessages,
  loadString,
  saveMessages,
  saveString,
  uid,
  type Message,
} from "@/lib/storage";

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
        content:
          "A minimal BYOK chat client for OpenRouter. Bring your key, pick a model, start chatting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Positron,
});

function Positron() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState("");
  const [ready, setReady] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

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
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#9a9aa8] transition-colors duration-150 hover:bg-[#15151a] hover:text-[#e8e8ee]"
            >
              <Plus size={15} className="text-[#ff5ea8]" />
              New
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#9a9aa8] transition-colors duration-150 hover:bg-[#15151a] hover:text-[#e8e8ee]"
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
