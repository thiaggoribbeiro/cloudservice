import { supabase } from "../../lib/supabaseClient";
import { STORAGE_BUCKET } from "../../lib/constants";

export type ResolvedShareLink = {
  kind: "file" | "folder";
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
};

export type PublicFolderFile = {
  id: string;
  name: string;
  mime_type: string | null;
  size_bytes: number;
  storage_path: string;
};

export async function resolveShareLink(token: string): Promise<ResolvedShareLink | null> {
  const { data, error } = await supabase.rpc("resolve_share_link", { p_token: token });
  if (error) throw error;
  return (data[0] as ResolvedShareLink | undefined) ?? null;
}

export async function listPublicFolderFiles(token: string): Promise<PublicFolderFile[]> {
  const { data, error } = await supabase.rpc("list_public_folder_files", { p_token: token });
  if (error) throw error;
  return data;
}

export async function getSignedUrlForPath(storagePath: string, ttlSeconds: number): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadPublicFile(storagePath: string, name: string): Promise<void> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
