import { supabase } from "../../lib/supabaseClient";
import type { Favorite, FileRow, Folder } from "../../types/domain";

type FavoriteRow = Favorite & { file: FileRow | null; folder: Folder | null };

export type FavoriteEntry =
  | { favoriteId: string; kind: "file"; file: FileRow }
  | { favoriteId: string; kind: "folder"; folder: Folder };

export async function listFavorites(userId: string): Promise<FavoriteEntry[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*, file:files(*), folder:folders(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data as unknown as FavoriteRow[];
  const entries: FavoriteEntry[] = [];
  for (const row of rows) {
    if (row.file && row.file.deleted_at === null) {
      entries.push({ favoriteId: row.id, kind: "file", file: row.file });
    } else if (row.folder && row.folder.deleted_at === null) {
      entries.push({ favoriteId: row.id, kind: "folder", folder: row.folder });
    }
  }
  return entries;
}

export async function listFavoriteIds(
  userId: string,
): Promise<{ fileIds: Set<string>; folderIds: Set<string> }> {
  const { data, error } = await supabase
    .from("favorites")
    .select("file_id, folder_id")
    .eq("user_id", userId);
  if (error) throw error;

  const fileIds = new Set<string>();
  const folderIds = new Set<string>();
  for (const row of data) {
    if (row.file_id) fileIds.add(row.file_id);
    if (row.folder_id) folderIds.add(row.folder_id);
  }
  return { fileIds, folderIds };
}

export async function addFavoriteFile(userId: string, fileId: string): Promise<void> {
  const { error } = await supabase.from("favorites").insert({ user_id: userId, file_id: fileId });
  if (error) throw error;
}

export async function removeFavoriteFile(userId: string, fileId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("file_id", fileId);
  if (error) throw error;
}

export async function addFavoriteFolder(userId: string, folderId: string): Promise<void> {
  const { error } = await supabase.from("favorites").insert({ user_id: userId, folder_id: folderId });
  if (error) throw error;
}

export async function removeFavoriteFolder(userId: string, folderId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("folder_id", folderId);
  if (error) throw error;
}
