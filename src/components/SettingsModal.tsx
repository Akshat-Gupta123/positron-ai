import { X, LogOut, Eye, EyeOff, ExternalLink, ShieldCheck, Mail } from "lucide-react";
import { useEffect, useState } from "react";

const MODEL_PRESETS = [
  { value: "openrouter/free", label: "openrouter/free", desc: "Free models" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku", desc: "Anthropic · fast" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", desc: "Anthropic · capable" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o mini", desc: "OpenAI · compact" },
  { value: "openai/gpt-4o", label: "GPT-4o", desc: "OpenAI · flagship" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Google · fast" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B", desc: "Meta · open" },
  { value: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek Chat V3", desc: "DeepSeek · budget" },
];

export function SettingsModal({
  open,
  apiKey,
  model,
  warn,
  onClose,
  onSave,
  onSignOut,
  userEmail,
}: {
  open: boolean;
  apiKey: string;
  model: string;
  warn: boolean;
  onClose: () => void;
  onSave: (apiKey: string, model: string) => void;
  onSignOut?: () => void;
  userEmail?: string;
}) {
  const [key, setKey] = useState(apiKey);
  const [mdl, setMdl] = useState(model);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(apiKey);
      setMdl(model);
    }
  }, [open, apiKey, model]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Cmd+S to save
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onSave(key.trim(), mdl.trim() || "openrouter/free");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onSave, key, mdl]);

  if (!open) return null;

  const isPreset = MODEL_PRESETS.some((m) => m.value === mdl);
  const hasKey = key.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm positron-modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="positron-modal w-full max-w-[480px] rounded-2xl border border-[#34343f] bg-[#1a1a20] p-6 shadow-2xl">
        {/* Header */}
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

        {/* Account section (if signed in) */}
        {userEmail && (
          <div className="mt-5 rounded-lg border border-[#2a2a33] bg-[#15151a] p-3">
            <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-[#9a9aa8]">
              <ShieldCheck size={11} className="text-[#00d9ff]" />
              <span>Signed in</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-[#e8e8ee]">
              <Mail size={13} className="text-[#9a9aa8]" />
              <span className="truncate">{userEmail}</span>
            </div>
          </div>
        )}

        {/* API key */}
        <div className="mt-5">
          <label
            htmlFor="pos-key"
            className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-[#9a9aa8]"
          >
            <span>OpenRouter API key</span>
            <span className="text-[10px] normal-case text-[#9a9aa8]/50">Optional</span>
          </label>
          <div className="relative mt-2">
            <input
              id="pos-key"
              type={showKey ? "text" : "password"}
              value={key}
              autoComplete="off"
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-or-v1-…"
              className="w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 pr-10 text-sm text-[#e8e8ee] outline-none transition-colors duration-150 placeholder:text-[#9a9aa8]/60 focus:border-[#00d9ff]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#9a9aa8] hover:bg-[#2a2a33] hover:text-[#e8e8ee]"
              aria-label={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[#9a9aa8]">
            <span>Get one at</span>
            <a
              className="inline-flex items-center gap-0.5 text-[#00d9ff] hover:underline"
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
            >
              openrouter.ai/keys
              <ExternalLink size={10} />
            </a>
            <span className="text-[#9a9aa8]/50">·</span>
            <span>Stored in your browser only.</span>
          </p>
          {warn && !hasKey && (
            <p className="mt-2 rounded-md border border-amber-900/30 bg-amber-950/20 px-2.5 py-1.5 text-[11px] text-amber-400">
              Using the built-in server key. Add your own to use your account instead.
            </p>
          )}
        </div>

        {/* Model */}
        <div className="mt-5">
          <label
            htmlFor="pos-model"
            className="block text-xs font-medium uppercase tracking-wide text-[#9a9aa8]"
          >
            Model
          </label>

          {/* Preset grid */}
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {MODEL_PRESETS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMdl(m.value)}
                className={`flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-all duration-150 ${
                  mdl === m.value
                    ? "border-[#00d9ff] bg-[#00d9ff]/10"
                    : "border-[#2a2a33] bg-[#0d0d10] hover:border-[#34343f]"
                }`}
              >
                <span
                  className={`text-[11px] font-medium ${
                    mdl === m.value ? "text-[#00d9ff]" : "text-[#e8e8ee]"
                  }`}
                >
                  {m.label}
                </span>
                <span className="text-[9px] text-[#9a9aa8]/60">{m.desc}</span>
              </button>
            ))}
          </div>

          {/* Custom model */}
          {!isPreset && (
            <div className="mt-2">
              <input
                id="pos-model"
                value={mdl}
                onChange={(e) => setMdl(e.target.value)}
                placeholder="openrouter/free"
                className="w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2 font-mono text-sm text-[#e8e8ee] outline-none transition-colors duration-150 placeholder:text-[#9a9aa8]/60 focus:border-[#00d9ff]"
              />
            </div>
          )}
          <p className="mt-2 text-[11px] text-[#9a9aa8]/60">
            Or type any OpenRouter model ID above if not in the list.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#2a2a33] pt-4">
          {onSignOut && userEmail ? (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 rounded-lg border border-[#34343f] px-3 py-2 text-sm text-[#9a9aa8] transition-all duration-150 hover:border-red-900/50 hover:bg-red-950/20 hover:text-red-400"
              title={`Sign out (${userEmail})`}
            >
              <LogOut size={14} />
              Sign out
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <kbd className="rounded bg-[#15151a] px-1.5 py-0.5 text-[10px] text-[#9a9aa8]/40">
              ⌘S
            </kbd>
            <button
              onClick={() => onSave(key.trim(), mdl.trim() || "openrouter/free")}
              className="rounded-lg bg-[#00d9ff] px-4 py-2 text-sm font-semibold text-[#0d0d10] transition-all duration-150 hover:brightness-110 active:scale-95"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
