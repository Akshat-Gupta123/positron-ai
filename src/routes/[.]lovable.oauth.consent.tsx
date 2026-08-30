import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthAuthorization = {
  client?: { name?: string; client_id?: string; redirect_uris?: string[] } | null;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
};

type OAuthResult = { data: OAuthAuthorization | null; error: { message: string } | null };

type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};

function oauth(): OAuthNamespace {
  return (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  head: () => ({
    meta: [
      { title: "Authorize access — Positron" },
      {
        name: "description",
        content: "Review and approve an AI client's request to use Positron on your behalf.",
      },
      { property: "og:title", content: "Authorize access — Positron" },
      {
        property: "og:description",
        content: "Approve or deny an AI client's request to connect to your Positron account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d10] px-4 text-[#e8e8ee]">
      <p className="max-w-[420px] text-center text-sm text-[#9a9aa8]">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "this client";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d10] px-4 text-[#e8e8ee]">
      <div className="w-full max-w-[440px] rounded-2xl border border-[#34343f] bg-[#1a1a20] p-6">
        <h1 className="text-xl font-semibold">Connect {clientName} to Positron</h1>
        <p className="mt-2 text-sm text-[#9a9aa8]">
          {clientName} will be able to call Positron&apos;s enabled tools while you are signed in.
        </p>

        {details?.client?.redirect_uris?.[0] && (
          <p className="mt-4 break-all rounded-lg border border-[#2a2a33] bg-[#15151a] px-3 py-2 font-mono text-xs text-[#9a9aa8]">
            {details.client.redirect_uris[0]}
          </p>
        )}

        {scopes.length > 0 && (
          <ul className="mt-4 flex flex-col gap-1 text-xs text-[#9a9aa8]">
            {scopes.map((s) => (
              <li key={s}>
                {s === "openid" || s === "profile"
                  ? "Share your basic profile"
                  : s === "email"
                    ? "Share your email address"
                    : `Additional permission requested: ${s}`}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-xs text-[#9a9aa8]">
          This does not bypass Positron&apos;s permissions or backend policies.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-[#ff5ea8]/40 bg-[#ff5ea8]/10 px-3 py-2 text-xs text-[#ff5ea8]">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="rounded-lg border border-[#34343f] px-4 py-2 text-sm text-[#9a9aa8] transition-colors duration-150 hover:text-[#e8e8ee] disabled:opacity-50"
          >
            Cancel connection
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="rounded-lg bg-[#00d9ff] px-4 py-2 text-sm font-semibold text-[#0d0d10] transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            Approve
          </button>
        </div>
      </div>
    </main>
  );
}
