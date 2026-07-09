import { supabase } from "../../lib/supabaseClient";
import { STORAGE_BUCKET } from "../../lib/constants";
import { logEvent } from "../eventLog/eventLogApi";
import type { Folder, FileRow } from "../../types/domain";

export async function listTrashedFolders(): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listTrashedFiles(): Promise<FileRow[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function softDeleteFolder(folderId: string): Promise<void> {
  const { data: current } = await supabase.from("folders").select("name").eq("id", folderId).single();
  const { error } = await supabase.rpc("soft_delete_folder", { p_folder_id: folderId });
  if (error) throw error;
  logEvent("mover_pasta_lixeira", "pasta", current?.name, folderId);
}

export async function softDeleteFile(fileId: string): Promise<void> {
  const { data: current } = await supabase.from("files").select("name").eq("id", fileId).single();
  const { error } = await supabase
    .from("files")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", fileId);
  if (error) throw error;
  logEvent("mover_arquivo_lixeira", "arquivo", current?.name, fileId);
}

export async function restoreFolder(folderId: string): Promise<void> {
  const { data: current } = await supabase.from("folders").select("name").eq("id", folderId).single();
  const { error } = await supabase.rpc("restore_folder", { p_folder_id: folderId });
  if (error) throw error;
  logEvent("restaurar_pasta", "pasta", current?.name, folderId);
}

export async function restoreFile(fileId: string): Promise<void> {
  const { data: current } = await supabase.from("files").select("name").eq("id", fileId).single();
  const { error } = await supabase.from("files").update({ deleted_at: null }).eq("id", fileId);
  if (error) throw error;
  logEvent("restaurar_arquivo", "arquivo", current?.name, fileId);
}

function collectSelfAndDescendantIds(
  folders: { id: string; parent_id: string | null }[],
  rootId: string,
): Set<string> {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }
  return ids;
}

export const TRASH_RETENTION_DAYS = 30;

export function daysRemainingInTrash(deletedAt: string): number {
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsedDays));
}

const TRASH_LOCK_MESSAGE =
  "Este item ainda nao pode ser excluido definitivamente (itens ficam 30 dias na lixeira).";

// Storage objects are only removed once the database row is confirmed
// deleted (RLS blocks the delete - and this returns zero rows - until the
// item has been in the trash for 30+ days), so a blocked attempt never
// orphans file bytes with no metadata pointing at them.
export async function permanentlyDeleteFolder(folderId: string): Promise<void> {
  const { data: allFolders, error: foldersError } = await supabase
    .from("folders")
    .select("id,parent_id,name");
  if (foldersError) throw foldersError;

  const targetName = allFolders.find((f) => f.id === folderId)?.name;
  const idsToPurge = Array.from(collectSelfAndDescendantIds(allFolders, folderId));

  const { data: filesToRemove, error: filesError } = await supabase
    .from("files")
    .select("storage_path")
    .in("folder_id", idsToPurge);
  if (filesError) throw filesError;

  const { data: deleted, error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .select();
  if (error) throw error;
  if (!deleted || deleted.length === 0) {
    throw new Error(TRASH_LOCK_MESSAGE);
  }

  if (filesToRemove.length > 0) {
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(filesToRemove.map((f) => f.storage_path));
  }

  logEvent("excluir_pasta_definitivo", "pasta", targetName, folderId);
}

export async function permanentlyDeleteFile(file: FileRow): Promise<void> {
  const { data: deleted, error } = await supabase
    .from("files")
    .delete()
    .eq("id", file.id)
    .select();
  if (error) throw error;
  if (!deleted || deleted.length === 0) {
    throw new Error(TRASH_LOCK_MESSAGE);
  }

  await supabase.storage.from(STORAGE_BUCKET).remove([file.storage_path]);
  logEvent("excluir_arquivo_definitivo", "arquivo", file.name, file.id);
}

export async function emptyTrash(): Promise<void> {
  const trashedFolders = await listTrashedFolders();
  for (const folder of trashedFolders) {
    await permanentlyDeleteFolder(folder.id).catch(() => {});
  }

  const trashedFiles = await listTrashedFiles();
  for (const file of trashedFiles) {
    await permanentlyDeleteFile(file).catch(() => {});
  }
}
