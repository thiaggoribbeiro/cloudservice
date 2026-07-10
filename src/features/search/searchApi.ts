import { supabase } from "../../lib/supabaseClient";
import type { FileRow, Folder } from "../../types/domain";

export type SearchResults = {
  folders: Folder[];
  files: FileRow[];
};

const RESULT_LIMIT = 8;

// Relies entirely on RLS to scope results to whatever the caller can already
// see (their own drive plus anything shared with them) - same visibility
// rules as every other query in the app, just matched by name instead of
// by folder/owner.
export async function searchFilesAndFolders(query: string): Promise<SearchResults> {
  const escaped = query.replace(/[%_]/g, (m) => `\\${m}`);

  const [foldersRes, filesRes] = await Promise.all([
    supabase
      .from("folders")
      .select("*")
      .ilike("name", `%${escaped}%`)
      .is("deleted_at", null)
      .order("name")
      .limit(RESULT_LIMIT),
    supabase
      .from("files")
      .select("*")
      .ilike("name", `%${escaped}%`)
      .is("deleted_at", null)
      .order("name")
      .limit(RESULT_LIMIT),
  ]);

  if (foldersRes.error) throw foldersRes.error;
  if (filesRes.error) throw filesRes.error;

  return { folders: foldersRes.data, files: filesRes.data };
}
