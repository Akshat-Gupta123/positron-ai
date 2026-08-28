import { useEffect, useRef } from "react";
import { renderMarkdown } from "@/lib/markdown";
import type { Message } from "@/lib/storage";

const SUGGESTIONS = [
  "Plan a weekend trip to Lisbon",
  "Find me the best deal on a 14\" laptop",
  "Write a Python function to dedupe a list",
  "Explain vector databases simply",
];

function Avatar({ role }: { role: Message["role"] }) {
  return (
    <div
      className={
        role === "user"
          ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#00d9ff]/12 text-xs text-[#00d9ff]"
          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1a1a20] text-sm text-[#00d9ff]"
      }
      aria-hidden
    >
      {role === "user" ? "◉" : "✦"}
    </div>
  );
}

export function Chat({
  messages,
  isStreaming,
  onPickSuggestion,
}: {
  messages: Message[];
  isStreaming: boolean;
  onPickSuggestion: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  const lastAssistantEmpty =
    isStreaming && messages.length > 0 && messages[messages.length - 1].content === "";

  return (
    <div ref={ref} className="positron-thread flex-1 overflow-y-auto px-5 pt-6">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="mx-auto max-w-[520px] text-center">
            <div className="text-6xl text-[#00d9ff] [text-shadow:0_0_28px_rgba(0,217,255,0.55)]">✦</div>
            <h1 className="mt-5 text-3xl font-semibold text-[#e8e8ee]">Good day.</h1>
            <p className="mt-2 text-sm text-[#9a9aa8]">Ask anything. Powered by OpenRouter.</p>
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onPickSuggestion(s)}
                  className="rounded-full border border-[#2a2a33] bg-[#15151a] px-3.5 py-2 text-xs text-[#9a9aa8] transition-all duration-150 hover:border-[#34343f] hover:text-[#e8e8ee]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`positron-enter mx-auto flex w-full max-w-[720px] gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar role={m.role} />
              <div className={`min-w-0 flex-1 ${m.role === "user" ? "flex justify-end" : ""}`}>
                {m.role === "user" ? (
                  <div className="max-w-full whitespace-pre-wrap rounded-2xl bg-gradient-to-br from-[#1e3a4a] to-[#163040] px-3.5 py-2.5 text-[15px] leading-6 text-white">
                    {m.content}
                  </div>
                ) : m.content ? (
                  <div
                    className="positron-md text-[15px] leading-7 text-[#e8e8ee]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                ) : null}
              </div>
            </div>
          ))}

          {lastAssistantEmpty && (
            <div className="mx-auto flex w-full max-w-[720px] items-center gap-2 pl-10 text-sm text-[#9a9aa8]">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#34343f] border-t-[#00d9ff]" />
              Thinking…
            </div>
          )}
        </div>
      )}
    </div>
  );
}
