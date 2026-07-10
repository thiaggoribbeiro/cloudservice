import { supabase } from "../../lib/supabaseClient";
import { logEvent } from "../eventLog/eventLogApi";
import type { Folder } from "../../types/domain";

// `ownerId` only ever filters the root level (parentId === null). Deeper
// levels must rely on RLS alone: a folder I own can contain subfolders
// created by a collaborator I shared it with (owner_id different from mine),
// and those must still show up for me. Only at the root is there real
// ambiguity - RLS alone would also surface someone else's root-level folder
// that they shared directly with me, which does not belong in "Meu Drive".
export async function listFolders(parentId: string | null, ownerId?: string): Promise<Folder[]> {
  let query = supabase.from("folders").select("*").is("deleted_at", null).order("name");
  query = parentId === null ? query.is("parent_id", null) : query.eq("parent_id", parentId);
  if (parentId === null && ownerId) {
    query = query.eq("owner_id", ownerId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listAllFoldersFlat(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data;
}

export async function createFolder(
  name: string,
  parentId: string | null,
  ownerId: string,
  isLocked?: boolean,
): Promise<Folder> {
  const { data, error } = await supabase
    .from("folders")
    .insert({ name, parent_id: parentId, owner_id: ownerId, is_locked: isLocked ?? false })
    .select()
    .single();
  if (error) throw error;
  logEvent("criar_pasta", "pasta", data.name, data.id);
  return data;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("folders").update({ name }).eq("id", id);
  if (error) throw error;
  logEvent("renomear_pasta", "pasta", name, id);
}

export async function moveFolder(id: string, newParentId: string | null): Promise<void> {
  const { data: current } = await supabase.from("folders").select("name").eq("id", id).single();
  const { error } = await supabase.from("folders").update({ parent_id: newParentId }).eq("id", id);
  if (error) throw error;
  logEvent("mover_pasta", "pasta", current?.name, id);
}

export async function toggleFolderLock(id: string, locked: boolean): Promise<void> {
  const { data: current } = await supabase.from("folders").select("name").eq("id", id).single();
  const { error } = await supabase.from("folders").update({ is_locked: locked }).eq("id", id);
  if (error) throw error;
  logEvent(locked ? "travar_pasta" : "destravar_pasta", "pasta", current?.name, id);
}

// Recursive sum of every file under a folder (including subfolders),
// computed on demand server-side rather than stored, so it can never drift.
export async function getFolderSize(folderId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_folder_size", { p_folder_id: folderId });
  if (error) throw error;
  return data ?? 0;
}
