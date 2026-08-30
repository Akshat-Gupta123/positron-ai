import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

function safeNext(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export const Route = createFileRoute("/login")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ next: safeNext(s.next) }),
  head: () => ({
    meta: [
      { title: "Sign in — Positron" },
      {
        name: "description",
        content: "Sign in to Positron to authorize agent integrations and connected AI clients.",
      },
      { property: "og:title", content: "Sign in — Positron" },
      { property: "og:description", content: "Sign in to Positron to authorize connected AI clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const next = Route.useSearch()["next"];
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const returnUrl = new URL(next, typeof window === "undefined" ? "http://localhost" : window.location.origin)
    .toString();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    if (mode === "signup") {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: returnUrl },
      });
      setBusy(false);
      if (err) return setError(err.message);
      setNotice("Check your inbox to confirm your address, then sign in.");
      return;
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) return setError(err.message);
    window.location.href = returnUrl;
  }

  async function onGoogle() {
    setError(null);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl });
    if (result.error) return setError(result.error.message ?? "Google sign-in failed.");
    if (result.redirected) return;
    void navigate({ to: next });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d10] px-4 text-[#e8e8ee]">
      <div className="w-full max-w-[400px] rounded-2xl border border-[#34343f] bg-[#1a1a20] p-6">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl font-semibold italic text-[#00d9ff]"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            e
          </span>
          <span className="font-medium text-white">Positron</span>
        </div>
        <h1 className="mt-4 text-xl font-semibold">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="mt-1 text-sm text-[#9a9aa8]">
          Signing in lets you authorize AI clients to use Positron as you.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-[#ff5ea8]/40 bg-[#ff5ea8]/10 px-3 py-2 text-xs text-[#ff5ea8]">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded-lg border border-[#2a2a33] bg-[#15151a] px-3 py-2 text-xs text-[#9a9aa8]">
            {notice}
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 text-sm outline-none focus:border-[#00d9ff]"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-[#34343f] bg-[#0d0d10] px-3 py-2.5 text-sm outline-none focus:border-[#00d9ff]"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#00d9ff] px-4 py-2.5 text-sm font-semibold text-[#0d0d10] transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={onGoogle}
          className="mt-3 w-full rounded-lg border border-[#34343f] bg-[#15151a] px-4 py-2.5 text-sm text-[#e8e8ee] transition-colors duration-150 hover:border-[#00d9ff]"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full text-xs text-[#9a9aa8] hover:text-[#e8e8ee]"
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
