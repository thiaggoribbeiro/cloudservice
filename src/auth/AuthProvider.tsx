import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { queryClient } from "../lib/queryClient";
import type { Profile } from "../types/domain";
import * as avestaId from "../lib/avestaId";

// Cutover flag for the AvestaID SSO pilot — see the AvestaID rollout plan.
const AVESTAID_ENABLED = import.meta.env.VITE_AVESTAID_ENABLED === "true";

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
}

// The app only ever reads session.user.id / session.user.email — build a
// duck-typed stand-in from the AvestaID session instead of touching every
// call site.
function avestaSessionToSession(s: avestaId.AvestaSession): Session {
  return { user: { id: s.user.id, email: s.user.email } } as unknown as Session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    if (AVESTAID_ENABLED) {
      const checkAvestaId = async () => {
        // The login page owns the handoff itself via avestaId.handleCallback();
        // ensureSession() here would otherwise race it and bounce back to the
        // portal before the one-time code has been redeemed.
        if (avestaId.hasCallbackCode()) {
          try {
            await avestaId.handleCallback();
          } catch (err) {
            console.error("Falha no handoff do AvestaID:", err);
            setLoading(false);
            return;
          }
        }

        const avestaSession = await avestaId.ensureSession();
        if (!avestaSession) return; // redirecting to the AvestaID portal; page is navigating away

        lastUserId.current = avestaSession.user.id;
        setSession(avestaSessionToSession(avestaSession));
        setProfile(await fetchProfile(avestaSession.user.id));
        setLoading(false);
      };
      checkAvestaId();
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      lastUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setProfile(data.session ? await fetchProfile(data.session.user.id) : null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const newUserId = newSession?.user.id ?? null;
      // Every cached query (folders, files, shares, storage usage) is keyed
      // without the user id, since it's always scoped to "whoever is signed
      // in right now" via RLS. If a different account signs in on the same
      // tab without a full reload, stale results from the previous user
      // would otherwise flash before refetching.
      if (newUserId !== lastUserId.current) {
        queryClient.clear();
        setProfile(null);
        if (newUserId) fetchProfile(newUserId).then(setProfile);
      }
      lastUserId.current = newUserId;
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function refreshProfile() {
    if (session) setProfile(await fetchProfile(session.user.id));
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
