import { supabase } from "../../lib/supabaseClient";
import type { Folder, FolderShare, ShareLink } from "../../types/domain";

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

export async function shareFolderWithUser(
  folderId: string,
  email: string,
  grantedBy: string,
): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile) {
    throw new Error("Nenhum usuario encontrado com esse e-mail.");
  }

  const { error } = await supabase.from("folder_shares").insert({
    folder_id: folderId,
    shared_with_user_id: profile.id,
    granted_by: grantedBy,
  });
  if (error) throw error;
}

export async function revokeFolderShare(shareId: string): Promise<void> {
  const { error } = await supabase.from("folder_shares").delete().eq("id", shareId);
  if (error) throw error;
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

export async function listShareLinksForFile(fileId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase.from("share_links").select("*").eq("file_id", fileId);
  if (error) throw error;
  return data;
}

export async function listShareLinksForFolder(folderId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase.from("share_links").select("*").eq("folder_id", folderId);
  if (error) throw error;
  return data;
}

export async function createShareLinkForFile(
  fileId: string,
  createdBy: string,
  expiresAt: string | null,
): Promise<ShareLink> {
  const { data, error } = await supabase
    .from("share_links")
    .insert({ file_id: fileId, created_by: createdBy, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createShareLinkForFolder(
  folderId: string,
  createdBy: string,
  expiresAt: string | null,
): Promise<ShareLink> {
  const { data, error } = await supabase
    .from("share_links")
    .insert({ folder_id: folderId, created_by: createdBy, expires_at: expiresAt })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function revokeShareLink(id: string): Promise<void> {
  const { error } = await supabase.from("share_links").delete().eq("id", id);
  if (error) throw error;
}

export function shareLinkUrl(token: string): string {
  return `${window.location.origin}/s/${token}`;
}
