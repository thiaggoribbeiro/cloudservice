import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabaseClient";

// id -> best human-readable label for that profile (display name, falling
// back to email since not every account has set one).
export type DisplayNameMap = Map<string, string>;

async function fetchDisplayNames(): Promise<DisplayNameMap> {
  const { data, error } = await supabase.from("profiles").select("id, display_name, email");
  if (error) throw error;
  return new Map(data.map((p) => [p.id, p.display_name || p.email]));
}

export function useDisplayNames() {
  return useQuery({
    queryKey: ["displayNames"],
    queryFn: fetchDisplayNames,
    staleTime: 5 * 60 * 1000,
  });
}
