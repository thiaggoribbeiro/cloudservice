import { supabase } from "../../lib/supabaseClient";
import { listAllFoldersFlat } from "../folders/folderApi";
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

// Walks the parent_id chain of a folder (using the already-fetched flat list
// of every folder the caller can see) to reconstruct the breadcrumb path
// needed to open it directly from a search result.
export async function buildFolderPath(folderId: string): Promise<Folder[]> {
  const allFolders = await listAllFoldersFlat();
  const byId = new Map(allFolders.map((f) => [f.id, f]));

  const path: Folder[] = [];
  let current = byId.get(folderId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}
