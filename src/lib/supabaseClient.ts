import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { getAccessToken } from "./avestaId";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltam variaveis de ambiente do Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).",
  );
}

const avestaIdEnabled = import.meta.env.VITE_AVESTAID_ENABLED === "true";

// When AvestaID is enabled, this project no longer mints its own sessions —
// every request is authorized with a token AvestaID minted for this app.
// supabase-js's own auth/session store is bypassed entirely in that mode.
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  avestaIdEnabled ? { accessToken: getAccessToken } : undefined,
);
