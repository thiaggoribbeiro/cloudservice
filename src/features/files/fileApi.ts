import JSZip from "jszip";
import { supabase } from "../../lib/supabaseClient";
import { STORAGE_BUCKET } from "../../lib/constants";
import { listFolders, createFolder, getFolderPath } from "../folders/folderApi";
import { logEvent } from "../eventLog/eventLogApi";
import type { FileRow, Folder } from "../../types/domain";

export async function listFiles(folderId: string | null): Promise<FileRow[]> {
  let query = supabase.from("files").select("*").is("deleted_at", null).order("name");
  query = folderId === null ? query.is("folder_id", null) : query.eq("folder_id", folderId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function uploadFile(
  file: File,
  folderId: string | null,
  ownerId: string,
): Promise<FileRow> {
  const fileId = crypto.randomUUID();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${ownerId}/${fileId}/${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file);
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("files")
    .insert({
      id: fileId,
      owner_id: ownerId,
      folder_id: folderId,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw error;
  }

  // Snapshot the folder breadcrumb at upload time (not re-derived later) so
  // the audit trail keeps saying where a file landed even if that folder
  // gets renamed or moved afterward - only navigating back to it needs the
  // current, live path.
  const folderPath = folderId ? await getFolderPath(folderId) : [];
  const folderPathLabel = folderPath.length ? folderPath.map((f) => f.name).join(" / ") : "Meus arquivos";
  logEvent("upload_arquivo", "arquivo", data.name, data.id, {
    folder_id: folderId,
    folder_path: folderPathLabel,
  });
  return data;
}

// Uploads a whole local folder (selected via a <input webkitdirectory> picker),
// recreating its subfolder structure under targetParentId before placing each
// file where it belongs. Folders are looked up before creation so re-uploading
// into an existing structure merges rather than duplicating folders.
export async function uploadFolderFiles(
  fileList: FileList,
  targetParentId: string | null,
  ownerId: string,
): Promise<void> {
  const folderCache = new Map<string, string | null>();
  folderCache.set("", targetParentId);

  async function ensureFolder(relDirPath: string): Promise<string | null> {
    if (folderCache.has(relDirPath)) return folderCache.get(relDirPath) ?? null;

    const parts = relDirPath.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parentId = await ensureFolder(parentPath);

    const existing = await listFolders(parentId);
    const match = existing.find((f) => f.name === name);
    const folder = match ?? (await createFolder(name, parentId, ownerId));

    folderCache.set(relDirPath, folder.id);
    return folder.id;
  }

  for (const file of Array.from(fileList)) {
    const relPath = file.webkitRelativePath || file.name;
    const lastSlash = relPath.lastIndexOf("/");
    const dir = lastSlash === -1 ? "" : relPath.slice(0, lastSlash);
    const folderId = await ensureFolder(dir);
    await uploadFile(file, folderId, ownerId);
  }
}

export async function downloadFile(file: FileRow): Promise<void> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(file.storage_path);
  if (error) throw error;

  touchLastAccessed(file.id);
  logEvent("download_arquivo", "arquivo", file.name, file.id);

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// Walks a folder's subtree (via the same RLS-scoped listFolders/listFiles
// calls the rest of the app uses) collecting every file with its path
// relative to the folder being downloaded, so the zip mirrors the folder
// structure instead of dumping everything flat.
async function collectFilesRecursive(
  folderId: string,
  relPath: string,
): Promise<{ file: FileRow; relPath: string }[]> {
  const [subfolders, files] = await Promise.all([listFolders(folderId), listFiles(folderId)]);
  const own = files.map((file) => ({ file, relPath: `${relPath}${file.name}` }));
  const nested = await Promise.all(
    subfolders.map((sub) => collectFilesRecursive(sub.id, `${relPath}${sub.name}/`)),
  );
  return [...own, ...nested.flat()];
}

export async function downloadFolder(folder: Folder): Promise<void> {
  const entries = await collectFilesRecursive(folder.id, "");
  if (entries.length === 0) throw new Error("Pasta vazia - nada para baixar.");

  const zip = new JSZip();
  for (const { file, relPath } of entries) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(file.storage_path);
    if (error) throw error;
    zip.file(relPath, data);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  logEvent("download_pasta", "pasta", folder.name, folder.id);

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${folder.name}.zip`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function getPreviewUrl(file: FileRow, ttlSeconds: number): Promise<string> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(file.storage_path, ttlSeconds);
  if (error) throw error;

  touchLastAccessed(file.id);

  return data.signedUrl;
}

// Fire-and-forget: powers "Pagina Inicial" (most recently accessed files).
// Never blocks or fails the caller's download/preview flow.
function touchLastAccessed(fileId: string): void {
  supabase
    .from("files")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", fileId)
    .then(() => {});
}

export async function renameFile(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("files").update({ name }).eq("id", id);
  if (error) throw error;
  logEvent("renomear_arquivo", "arquivo", name, id);
}

export async function moveFile(id: string, newFolderId: string | null): Promise<void> {
  const { data: current } = await supabase.from("files").select("name").eq("id", id).single();
  const { error } = await supabase.from("files").update({ folder_id: newFolderId }).eq("id", id);
  if (error) throw error;
  logEvent("mover_arquivo", "arquivo", current?.name, id);
}
