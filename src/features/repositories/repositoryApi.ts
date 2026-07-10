import { supabase } from "../../lib/supabaseClient";
import { logEvent } from "../eventLog/eventLogApi";
import { softDeleteFolder } from "../trash/trashApi";
import type { Folder, Repository } from "../../types/domain";

export type RepositoryWithRoot = Repository & { root_folder: Folder | null };
export type RepositoryWithActiveRoot = Repository & { root_folder: Folder };

export async function listRepositories(): Promise<RepositoryWithRoot[]> {
  const { data, error } = await supabase
    .from("repositories")
    .select("*, root_folder:folders!repositories_root_folder_id_fkey!inner(*)")
    .is("root_folder.deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data as unknown as RepositoryWithRoot[];
}

export async function createRepository(
  name: string,
  quotaBytes: number,
): Promise<{ repositoryId: string; rootFolder: Folder }> {
  const { data, error } = await supabase
    .rpc("create_repository", { p_name: name, p_quota_bytes: quotaBytes })
    .single();
  if (error) throw error;

  const { data: rootFolder, error: folderError } = await supabase
    .from("folders")
    .select("*")
    .eq("id", data.root_folder_id)
    .single();
  if (folderError) throw folderError;

  logEvent("criar_repositorio", "repositorio", name, data.repository_id);
  return { repositoryId: data.repository_id, rootFolder };
}

export async function renameRepository(
  repositoryId: string,
  rootFolderId: string,
  name: string,
): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  const { data: current } = await supabase
    .from("repositories")
    .select("name")
    .eq("id", repositoryId)
    .single();

  const { error: folderError } = await supabase
    .from("folders")
    .update({ name: trimmedName })
    .eq("id", rootFolderId);
  if (folderError) throw folderError;

  const { error } = await supabase
    .from("repositories")
    .update({ name: trimmedName })
    .eq("id", repositoryId);
  if (error) throw error;

  logEvent("renomear_repositorio", "repositorio", trimmedName, repositoryId, { previous_name: current?.name });
}

export async function deleteRepository(repository: RepositoryWithActiveRoot): Promise<void> {
  await softDeleteFolder(repository.root_folder.id);
  logEvent("excluir_repositorio", "repositorio", repository.name, repository.id, {
    root_folder_id: repository.root_folder.id,
  });
}

export async function updateRepositoryQuota(repositoryId: string, quotaBytes: number): Promise<void> {
  const { data: current } = await supabase
    .from("repositories")
    .select("name")
    .eq("id", repositoryId)
    .single();
  const { error } = await supabase
    .from("repositories")
    .update({ quota_bytes: quotaBytes })
    .eq("id", repositoryId);
  if (error) throw error;
  logEvent("editar_cota_repositorio", "repositorio", current?.name, repositoryId, { quota_bytes: quotaBytes });
}

export async function getRepositoryUsage(
  repositoryId: string,
): Promise<{ used_bytes: number; quota_bytes: number }> {
  const { data, error } = await supabase
    .rpc("get_repository_usage", { p_repository_id: repositoryId })
    .single();
  if (error) throw error;
  return data;
}

export const REPOSITORY_QUOTA_MIN_BYTES = 1073741824; // 1 GiB
export const REPOSITORY_QUOTA_MAX_BYTES = 10737418240; // 10 GiB
export const REPOSITORY_QUOTA_DEFAULT_BYTES = 2684354560; // 2.5 GiB
