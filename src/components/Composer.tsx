import { ArrowRight, ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useState } from "react";

const MODELS = [
  { value: "openrouter/free", label: "Free (default)" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { value: "mistralai/mistral-nemo", label: "Mistral Nemo" },
  { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat V3" },
];

function ModelBadge({
  model,
  onClick,
}: {
  model: string;
  onClick: () => void;
}) {
  const known = MODELS.find((m) => m.value === model);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full border border-[#2a2a33] bg-[#0d0d10] px-2.5 py-1 text-[11px] text-[#9a9aa8] transition-all duration-150 hover:border-[#34343f] hover:text-[#e8e8ee]"
      title="Change model"
    >
      <span className="max-w-[140px] truncate font-mono">{known?.label ?? model}</span>
      <ChevronDown size={10} className="shrink-0" />
    </button>
  );
}

function ModelDropdown({
  model,
  onChange,
  onClose,
}: {
  model: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute bottom-full left-0 mb-2 w-[280px] rounded-xl border border-[#2a2a33] bg-[#1a1a20] p-1.5 shadow-2xl"
      style={{ boxShadow: "0 -8px 40px rgba(0,0,0,0.5)" }}
    >
      <p className="px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#9a9aa8]/60">
        Select model
      </p>
      {MODELS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => {
            onChange(m.value);
            onClose();
          }}
          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors duration-100 ${
            m.value === model
              ? "bg-[#00d9ff]/10 text-[#00d9ff]"
              : "text-[#9a9aa8] hover:bg-[#2a2a33] hover:text-[#e8e8ee]"
          }`}
        >
          <span>{m.label}</span>
          {m.value === model && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d9ff]" />
          )}
        </button>
      ))}
      <div className="mt-1 border-t border-[#2a2a33] pt-1.5">
        <p className="px-2.5 py-1 text-[10px] text-[#9a9aa8]/40">
          Or enter any OpenRouter model ID in Settings.
        </p>
      </div>
    </div>
  );
}

export function Composer({
  input,
  setInput,
  onSend,
  disabled,
  model,
  textareaRef,
}: {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  model: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const canSend = !disabled && input.trim().length > 0;
  const [showModelPicker, setShowModelPicker] = useState(false);

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  // Close model picker on outside click
  useEffect(() => {
    if (!showModelPicker) return;
    const handler = () => setShowModelPicker(false);
    // Delay so the click that opens it doesn't immediately close
    const t = setTimeout(() => document.addEventListener("click", handler, { once: true }), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", handler);
    };
  }, [showModelPicker]);

  return (
    <div className="sticky bottom-0 border-t border-[#2a2a33] bg-[#0d0d10] px-5 pb-3 pt-3">
      <div className="mx-auto w-full max-w-[720px]">
        {/* Model picker dropdown */}
        {showModelPicker && (
          <ModelDropdown
            model={model}
            onChange={(v) => {
              // Signal model change back via a custom event
              window.dispatchEvent(new CustomEvent("positron:model-change", { detail: v }));
            }}
            onClose={() => setShowModelPicker(false)}
          />
        )}

        {/* Input box */}
        <div
          className={`flex items-end gap-2 rounded-2xl border bg-[#15151a] px-3 py-2.5 transition-all duration-200 ${
            disabled
              ? "border-[#2a2a33]/50 opacity-60"
              : "border-[#34343f] focus-within:border-[#00d9ff] focus-within:shadow-[0_0_0_3px_rgba(0,217,255,0.12)]"
          }`}
        >
          {/* Model badge */}
          <div className="relative shrink-0 self-start pt-0.5">
            <ModelBadge model={model} onClick={() => setShowModelPicker((v) => !v)} />
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={disabled}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow(e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder={disabled ? "Waiting for response…" : "Message Positron…"}
            className="max-h-[200px] min-h-[24px] flex-1 resize-none border-0 bg-transparent text-[15px] leading-6 text-[#e8e8ee] outline-none placeholder:text-[#9a9aa8]/60 disabled:cursor-not-allowed"
          />

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
              canSend
                ? "bg-[#00d9ff] text-[#0d0d10] shadow-[0_2px_8px_rgba(0,217,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,217,255,0.4)] active:scale-95"
                : "bg-[#2a2a33] text-[#9a9aa8]/40 cursor-not-allowed"
            }`}
          >
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Footer hints */}
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#9a9aa8]/40">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded bg-[#15151a] px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
            <span>send</span>
            <span className="mx-1 opacity-50">·</span>
            <kbd className="rounded bg-[#15151a] px-1.5 py-0.5 font-mono text-[10px]">⇧↵</kbd>
            <span>newline</span>
          </span>
          {input.length > 0 && (
            <span className="tabular-nums">{input.length} chars</span>
          )}
        </div>
      </div>
    </div>
  );
}

