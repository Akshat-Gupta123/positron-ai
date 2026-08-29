import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Session, User } from "@supabase/supabase-js";

export type AuthState = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<{ error: string | undefined }>;
  signUp: (email: string, password: string) => Promise<{ error: string | undefined }>;
  signOut: () => Promise<void>;
};

export function useAuth(): AuthState {
  const configured = isSupabaseConfigured;
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const supabase = getSupabase();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  const signIn = async (email: string, password: string) => {
    if (!configured) return { error: "Supabase not configured" };
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  };

  const signUp = async (email: string, password: string) => {
    if (!configured) return { error: "Supabase not configured" };
    const supabase = getSupabase();
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message };
  };

  const signOut = async () => {
    if (!configured) return;
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  return { configured, loading, user, session, signIn, signUp, signOut };
}
