import { supabase } from "../../lib/supabaseClient";
import { logEvent } from "../eventLog/eventLogApi";
import type { Folder, FolderShare } from "../../types/domain";

export type FolderShareWithProfile = FolderShare & {
  profile: { email: string; display_name: string | null } | null;
};

export async function listFolderShares(folderId: string): Promise<FolderShareWithProfile[]> {
  const { data: shares, error } = await supabase
    .from("folder_shares")
    .select("*")
    .eq("folder_id", folderId);
  if (error) throw error;
  if (shares.length === 0) return [];

  const userIds = shares.map((s) => s.shared_with_user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);
  if (profilesError) throw profilesError;

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  return shares.map((share) => ({
    ...share,
    profile: profileById.get(share.shared_with_user_id) ?? null,
  }));
}

export type ShareableUser = { id: string; email: string; display_name: string | null };

// Every registered member, so the share dialog can offer a pick-list instead
// of asking the sharer to type an email correctly (profiles are readable by
// any authenticated user - see the "ver todos os perfis basicos" RLS policy).
export async function listShareableUsers(): Promise<ShareableUser[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .order("display_name");
  if (error) throw error;
  return data;
}

export async function shareFolderWithUsers(
  folderId: string,
  userIds: string[],
  grantedBy: string,
): Promise<void> {
  const { error } = await supabase.from("folder_shares").insert(
    userIds.map((userId) => ({
      folder_id: folderId,
      shared_with_user_id: userId,
      granted_by: grantedBy,
    })),
  );
  if (error) throw error;
  const { data: folder } = await supabase.from("folders").select("name").eq("id", folderId).single();
  logEvent("convidar_membro", "compartilhamento", folder?.name, folderId, { shared_with: userIds });
}

export async function revokeFolderShare(shareId: string): Promise<void> {
  const { data: share } = await supabase
    .from("folder_shares")
    .select("folder_id, folder:folders(name)")
    .eq("id", shareId)
    .single();
  const { error } = await supabase.from("folder_shares").delete().eq("id", shareId);
  if (error) throw error;
  const folderName = (share?.folder as { name: string } | null)?.name;
  logEvent("remover_convite", "compartilhamento", folderName, share?.folder_id);
}

export type SharedFolderEntry = { share: FolderShare; folder: Folder };

export async function listSharedWithMe(userId: string): Promise<SharedFolderEntry[]> {
  const { data, error } = await supabase
    .from("folder_shares")
    .select("*, folder:folders(*)")
    .eq("shared_with_user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data as unknown as (FolderShare & { folder: Folder | null })[])
    .filter(
      (row): row is FolderShare & { folder: Folder } =>
        row.folder !== null && row.folder.deleted_at === null,
    )
    .map((row) => ({ share: row, folder: row.folder }));
}

