import { ArrowRight } from "lucide-react";
import type { RefObject } from "react";

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

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className="sticky bottom-0 border-t border-[#2a2a33] bg-[#0d0d10] px-5 pb-2.5 pt-3">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="flex items-end gap-2 rounded-2xl border border-[#34343f] bg-[#15151a] px-3 py-2.5 transition-all duration-150 focus-within:border-[#00d9ff] focus-within:shadow-[0_0_0_3px_rgba(0,217,255,0.15)]">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
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
            placeholder="Message Positron…"
            className="max-h-[200px] flex-1 resize-none border-0 bg-transparent text-[15px] leading-6 text-[#e8e8ee] outline-none placeholder:text-[#9a9aa8]"
          />
          <button
            onClick={onSend}
            disabled={!canSend}
            aria-label="Send message"
            className={
              canSend
                ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#00d9ff] text-[#0d0d10] transition-all duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
                : "flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-lg bg-[#2a2a33] text-[#9a9aa8]"
            }
          >
            <ArrowRight size={17} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#9a9aa8]">
          <span className="font-mono">{model}</span>
          <span>Enter to send · Shift+Enter for newline</span>
        </div>
      </div>
    </div>
  );
}
