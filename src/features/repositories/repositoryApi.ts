import { supabase } from "../../lib/supabaseClient";
import type { Folder, Repository } from "../../types/domain";

export type RepositoryWithRoot = Repository & { root_folder: Folder | null };

export async function listRepositories(): Promise<RepositoryWithRoot[]> {
  const { data, error } = await supabase
    .from("repositories")
    .select("*, root_folder:folders!repositories_root_folder_id_fkey(*)")
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

  return { repositoryId: data.repository_id, rootFolder };
}

export async function updateRepositoryQuota(repositoryId: string, quotaBytes: number): Promise<void> {
  const { error } = await supabase
    .from("repositories")
    .update({ quota_bytes: quotaBytes })
    .eq("id", repositoryId);
  if (error) throw error;
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
