import { supabase } from "../../lib/supabaseClient";
import type { FileRow } from "../../types/domain";

export async function listRecentFiles(ownerId: string, limit = 40): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("last_accessed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}
