import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";
import type { Message } from "@/lib/storage";

const SUGGESTIONS = [
  "Plan a weekend trip to Lisbon",
  "Find me the best deal on a 14\" laptop",
  "Write a Python function to dedupe a list",
  "Explain vector databases simply",
];

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
}

// ── Code block with copy button ────────────────────────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="positron-code-wrapper group relative my-2">
      {lang && (
        <span className="positron-code-lang absolute left-3 top-2 select-none text-[10px] font-medium uppercase tracking-wider text-[#9a9aa8]/60">
          {lang}
        </span>
      )}
      <button
        onClick={copy}
        aria-label={copied ? "Copied!" : "Copy code"}
        className={`positron-code-copy-btn absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md transition-all duration-150 ${
          lang ? "top-7" : "top-2"
        } opacity-0 group-hover:opacity-100`}
      >
        {copied ? (
          <Check size={13} className="text-[#00d9ff]" />
        ) : (
          <Copy size={13} className="text-[#9a9aa8]" />
        )}
      </button>
      <pre className={`${lang ? "pt-7" : ""}`}>
        <code className={`language-${lang || "plaintext"} text-[13px]`}>{code}</code>
      </pre>
    </div>
  );
}

// ── Markdown renderer with code block support ───────────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Code fence
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] ?? "";
      i++;
      const body: string[] = [];
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i] ?? "")) {
        body.push(lines[i] ?? "");
        i++;
      }
      i++;
      // Emit as a marker the code renderer will handle
      parts.push(`\x00CODEBLOCK\x00${lang}\x00${body.join("\n")}\x00CODEBLOCK_END\x00`);
      continue;
    }

    parts.push(line + (i < lines.length - 1 ? "\n" : ""));
    i++;
  }

  let html = renderMarkdown(parts.join("\n"));
  // Replace code block markers with React components (done by post-processing after dangerouslySetInnerHTML)
  // Instead, let's handle code blocks inline
  html = html.replace(/<pre><code class="language-([^"]*)">([\s\S]*?)<\/code><\/pre>/g, (_m, lang, code) => {
    const decoded = code
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return `<div class="positron-code-wrapper group relative my-2"><span class="positron-code-lang absolute left-3 top-2 select-none text-[10px] font-medium uppercase tracking-wider text-[#9a9aa8]/60">${lang}</span><button onclick="void 0" class="positron-code-copy-btn absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100" data-code="${encodeURIComponent(decoded)}"><svg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='text-[#9a9aa8]'><rect width='14' height='14' x='8' y='8' rx='2' ry='2'/><path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2'/></svg></button><pre class="pt-7"><code class="language-${lang} text-[13px]">${code}</code></pre></div>`;
  });

  return <div className="positron-md" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ role }: { role: Message["role"] }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] ${
        role === "user"
          ? "bg-gradient-to-br from-[#00d9ff]/20 to-[#00d9ff]/5 ring-1 ring-[#00d9ff]/20"
          : "bg-[#1a1a20] ring-1 ring-[#2a2a33]"
      }`}
      aria-hidden
    >
      {role === "user" ? (
        <span className="text-[#00d9ff]">◉</span>
      ) : (
        <span
          className="bg-gradient-to-br from-[#00d9ff] to-[#ff5ea8] bg-clip-text text-[16px] font-semibold italic text-transparent"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          e
        </span>
      )}
    </div>
  );
}

// ── Streaming cursor ────────────────────────────────────────────────────────────
function StreamingCursor() {
  return (
    <span className="positron-cursor" aria-hidden>
      ▊
    </span>
  );
}

// ── Message copy ────────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      aria-label={copied ? "Copied" : "Copy message"}
      className="positron-msg-actions flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9a9aa8] transition-all duration-150 hover:bg-[#2a2a33] hover:text-[#e8e8ee]"
    >
      {copied ? <Check size={14} className="text-[#00d9ff]" /> : <Copy size={14} />}
    </button>
  );
}

// ── Main Chat ─────────────────────────────────────────────────────────────────
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
  const prevLength = useRef(messages.length);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Scroll to bottom: always for new messages, smooth for user scrolls
    if (messages.length > prevLength.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages, isStreaming]);

  const lastAssistant = messages.filter((m) => m.role === "assistant").at(-1);
  const lastAssistantEmpty = isStreaming && (!lastAssistant || !lastAssistant.content);

  return (
    <div ref={ref} className="positron-thread flex-1 overflow-y-auto px-5 pt-6">
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <div className="mx-auto max-w-[560px] text-center">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="text-7xl text-[#00d9ff] [text-shadow:0_0_40px_rgba(0,217,255,0.5)]">✦</div>
                <div className="positron-logo-ring absolute inset-0 -z-10 rounded-full blur-2xl" />
              </div>
            </div>

            <h1 className="mt-6 text-3xl font-semibold text-[#e8e8ee]">
              Good day.
            </h1>
            <p className="mt-2 text-sm text-[#9a9aa8]">
              Ask anything — powered by{" "}
              <span className="text-[#e8e8ee]">OpenRouter</span>.
            </p>

            {/* Suggestions */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onPickSuggestion(s)}
                  className="rounded-full border border-[#2a2a33] bg-[#15151a] px-4 py-2 text-xs text-[#9a9aa8] transition-all duration-150 hover:border-[#34343f] hover:bg-[#1a1a20] hover:text-[#e8e8ee] active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>

            <p className="mt-8 text-[11px] text-[#9a9aa8]/40">
              Press <kbd className="rounded bg-[#15151a] px-1 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
              to send ·{" "}
              <kbd className="rounded bg-[#15151a] px-1 py-0.5 font-mono text-[10px]">Shift+Enter</kbd>{" "}
              for newline
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 pb-4">
          {messages.map((m, idx) => (
            <div
              key={m.id}
              className={`positron-enter group flex gap-3 ${
                m.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
              style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
            >
              <Avatar role={m.role} />
              <div
                className={`min-w-0 flex-1 ${m.role === "user" ? "flex flex-col items-end" : ""}`}
              >
                {/* Message actions — visible on hover */}
                {m.role === "assistant" && m.content && (
                  <div className="positron-msg-actions -mt-1 mb-1 flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <CopyButton text={m.content} />
                  </div>
                )}

                {m.role === "user" ? (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-gradient-to-br from-[#1a3a50] to-[#102030] px-4 py-3 text-[15px] leading-7 text-white shadow-sm">
                    {m.content}
                  </div>
                ) : m.content ? (
                  <div className="positron-assistant-msg max-w-[85%]">
                    <MarkdownContent content={m.content} />
                    {isStreaming && idx === messages.length - 1 && (
                      <StreamingCursor />
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {lastAssistantEmpty && (
            <div className="flex items-center gap-3 pl-11">
              <div className="flex gap-1">
                <span className="positron-dot h-2 w-2 rounded-full bg-[#00d9ff]/60" />
                <span className="positron-dot h-2 w-2 rounded-full bg-[#00d9ff]/40" style={{ animationDelay: "160ms" }} />
                <span className="positron-dot h-2 w-2 rounded-full bg-[#00d9ff]/30" style={{ animationDelay: "320ms" }} />
              </div>
              <span className="text-sm text-[#9a9aa8]">Thinking…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
