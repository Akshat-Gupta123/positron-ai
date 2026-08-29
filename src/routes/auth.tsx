import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Settings } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [{ title: "Sign in — Positron" }],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!configured) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0d0d10]">
        <div className="max-w-sm text-center">
          <div className="mb-6 text-6xl text-[#00d9ff] [text-shadow:0_0_28px_rgba(0,217,255,0.55)]">✦</div>
          <h1 className="text-2xl font-semibold text-[#e8e8ee]">Positron</h1>
          <p className="mt-3 text-sm text-[#9a9aa8]">
            Supabase is not configured. Add <code className="rounded bg-[#15151a] px-1">VITE_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-[#15151a] px-1">VITE_SUPABASE_ANON_KEY</code> to your{" "}
            <code className="rounded bg-[#15151a] px-1">.env.local</code> file to enable auth.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result =
      mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === "signup") {
      setSuccess("Check your email for a confirmation link to activate your account.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d0d10] px-4">
      {/* Logo */}
      <div className="absolute left-1/2 top-12 -translate-x-1/2 flex items-center gap-2">
        <span
          className="text-2xl font-semibold italic text-[#00d9ff]"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          e
        </span>
        <span className="font-medium text-white">Positron</span>
      </div>

      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-[#2a2a33] bg-[#15151a] p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-[#e8e8ee]">
            {mode === "signin" ? "Welcome back." : "Create your account."}
          </h2>
          <p className="mt-1 text-sm text-[#9a9aa8]">
            {mode === "signin"
              ? "Sign in to access your conversations."
              : "Your chats will sync across devices."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium uppercase tracking-wide text-[#9a9aa8]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 text-sm text-[#e8e8ee] outline-none transition-colors placeholder:text-[#9a9aa8]/50 focus:border-[#00d9ff]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium uppercase tracking-wide text-[#9a9aa8]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="mt-1.5 w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 text-sm text-[#e8e8ee] outline-none transition-colors placeholder:text-[#9a9aa8]/50 focus:border-[#00d9ff]"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            {success && (
              <p className="rounded-lg border border-[#00d9ff]/30 bg-[#00d9ff]/10 px-3 py-2 text-xs text-[#00d9ff]">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#00d9ff] py-2.5 text-sm font-semibold text-[#0d0d10] transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-[#9a9aa8]">
            {mode === "signin" ? "No account yet?" : "Already have one?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setSuccess(null);
              }}
              className="text-[#00d9ff] hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Powered by */}
        <p className="mt-6 text-center text-xs text-[#9a9aa8]/50">
          Powered by OpenRouter · Chat history synced via Supabase
        </p>
      </div>
    </div>
  );
}
