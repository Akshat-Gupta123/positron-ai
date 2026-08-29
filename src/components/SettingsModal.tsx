import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function SettingsModal({
  open,
  apiKey,
  model,
  warn,
  onClose,
  onSave,
}: {
  open: boolean;
  apiKey: string;
  model: string;
  warn: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => void;
}) {
  const [key, setKey] = useState(apiKey);
  const [mdl, setMdl] = useState(model);

  useEffect(() => {
    if (open) {
      setKey(apiKey);
      setMdl(model);
    }
  }, [open, apiKey, model]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[460px] rounded-2xl border border-[#34343f] bg-[#1a1a20] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#e8e8ee]">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1 text-[#9a9aa8] transition-colors duration-150 hover:bg-[#15151a] hover:text-[#e8e8ee]"
          >
            <X size={18} />
          </button>
        </div>

        {warn && (
          <p className="mt-4 rounded-lg border border-[#2a2a33] bg-[#15151a] px-3 py-2 text-xs text-[#9a9aa8]">
            Using the built-in server key. Add your own OpenRouter key to use your account instead.
          </p>
        )}

        <div className="mt-5">
          <label htmlFor="pos-key" className="text-xs font-medium uppercase tracking-wide text-[#9a9aa8]">
            OpenRouter API key (optional)
          </label>
          <input
            id="pos-key"
            type="password"
            value={key}
            autoComplete="off"
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-or-v1-…"
            className="mt-2 w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 text-sm text-[#e8e8ee] outline-none transition-colors duration-150 placeholder:text-[#9a9aa8]/60 focus:border-[#00d9ff]"
          />

          <p className="mt-2 text-xs text-[#9a9aa8]">
            Get one at{" "}
            <a
              className="text-[#00d9ff] hover:underline"
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              openrouter.ai/keys
            </a>
            . Stored only in this browser.
          </p>
        </div>

        <div className="mt-5">
          <label htmlFor="pos-model" className="text-xs font-medium uppercase tracking-wide text-[#9a9aa8]">
            Model
          </label>
          <input
            id="pos-model"
            value={mdl}
            onChange={(e) => setMdl(e.target.value)}
            placeholder="openrouter/free"
            className="mt-2 w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 font-mono text-sm text-[#e8e8ee] outline-none transition-colors duration-150 placeholder:text-[#9a9aa8]/60 focus:border-[#00d9ff]"
          />
          <p className="mt-2 text-xs text-[#9a9aa8]">
            e.g. <code className="rounded bg-[#15151a] px-1 py-0.5 font-mono">openrouter/free</code>,{" "}
            <code className="rounded bg-[#15151a] px-1 py-0.5 font-mono">anthropic/claude-3.5-sonnet</code>,{" "}
            <code className="rounded bg-[#15151a] px-1 py-0.5 font-mono">openai/gpt-4o</code>
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => onSave(key.trim(), mdl.trim() || "openrouter/free")}
            className="rounded-lg bg-[#00d9ff] px-[18px] py-[9px] text-sm font-semibold text-[#0d0d10] transition-all duration-150 hover:brightness-110 active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
