import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Folder, FileRow, UserRole } from "../../types/domain";
import { formatBytes, isPreviewable, formatRelativeTime } from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { downloadFile, renameFile, moveFile } from "./fileApi";
import { renameFolder, moveFolder, toggleFolderLock } from "../folders/folderApi";
import { softDeleteFolder, softDeleteFile } from "../trash/trashApi";
import {
  addFavoriteFile,
  addFavoriteFolder,
  removeFavoriteFile,
  removeFavoriteFolder,
} from "../favorites/favoritesApi";
import { useFavoriteIds } from "../favorites/useFavoriteIds";
import { StarIcon, LockIcon } from "../../components/ui/icons";
import { RenameDialog } from "../folders/RenameDialog";
import { MoveDialog } from "../folders/MoveDialog";
import { ShareDialog } from "../sharing/ShareDialog";
import { PreviewModal } from "./PreviewModal";
import { EmptyState } from "../../components/ui/EmptyState";

type ActiveDialog =
  | { kind: "rename-folder"; folder: Folder }
  | { kind: "rename-file"; file: FileRow }
  | { kind: "move-folder"; folder: Folder }
  | { kind: "move-file"; file: FileRow }
  | { kind: "share-folder"; folder: Folder }
  | { kind: "share-file"; file: FileRow }
  | { kind: "preview"; file: FileRow };

function ItemMenu({
  onRename,
  onMove,
  onShare,
  onDownload,
  onToggleFavorite,
  isFavorited,
  onToggleLock,
  isLocked,
  onDelete,
  onOpen,
  onClose,
}: {
  onRename?: () => void;
  onMove?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
  onToggleLock?: () => void;
  isLocked?: boolean;
  onDelete?: () => void;
  onOpen: boolean;
  onClose: () => void;
}) {
  if (!onOpen) return null;
  return (
    <div
      data-item-menu
      className="stagger-0 absolute right-2 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-brand-border bg-white py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface"
      onClick={(e) => e.stopPropagation()}
    >
      {onDownload && (
        <button
          type="button"
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
        >
          Baixar
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onToggleFavorite();
          onClose();
        }}
        className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
      >
        {isFavorited ? "Remover dos favoritos" : "Favoritar"}
      </button>
      {onShare && (
        <button
          type="button"
          onClick={() => {
            onShare();
            onClose();
          }}
          className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
        >
          Compartilhar
        </button>
      )}
      {onRename && (
        <button
          type="button"
          onClick={() => {
            onRename();
            onClose();
          }}
          className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
        >
          Renomear
        </button>
      )}
      {onMove && (
        <button
          type="button"
          onClick={() => {
            onMove();
            onClose();
          }}
          className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
        >
          Mover
        </button>
      )}
      {onToggleLock && (
        <button
          type="button"
          onClick={() => {
            onToggleLock();
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
        >
          <LockIcon className="h-4 w-4 shrink-0" />
          {isLocked ? "Destravar pasta" : "Travar pasta"}
        </button>
      )}
      {onDelete && (
        <>
          <div className="my-1 border-t border-brand-border dark:border-white/10" />
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="block w-full px-3.5 py-2 text-left text-sm text-brand-primary transition-colors hover:bg-brand-pale/50 dark:hover:bg-white/10"
          >
            Mover para lixeira
          </button>
        </>
      )}
    </div>
  );
}

export function FileGrid({
  folders,
  files,
  currentFolderId,
  currentUserId,
  userRole,
  onOpenFolder,
}: {
  folders: Folder[];
  files: FileRow[];
  currentFolderId: string | null;
  currentUserId: string;
  userRole: UserRole;
  onOpenFolder: (folder: Folder) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const queryClient = useQueryClient();

  const isManager = userRole === "admin" || userRole === "manager";

  // Only admin/manager may delete items they don't own - a plain user or
  // guest can delete only what they created/uploaded themselves, even
  // inside a folder shared with them for editing. A locked folder can only
  // be deleted by admin/manager regardless of ownership (enforced again
  // server-side by a trigger).
  function canDelete(ownerId: string, locked?: boolean) {
    if (locked && !isManager) return false;
    return isManager || ownerId === currentUserId;
  }

  useEffect(() => {
    if (!openMenuId) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-item-menu]") || target.closest("[data-item-menu-trigger]")) {
        return;
      }
      setOpenMenuId(null);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuId]);

  function invalidateCurrent() {
    queryClient.invalidateQueries({ queryKey: ["folderChildren", currentFolderId] });
    queryClient.invalidateQueries({ queryKey: ["files", currentFolderId] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
  }

  const deleteFolderMutation = useMutation({
    mutationFn: softDeleteFolder,
    onSuccess: invalidateCurrent,
  });
  const deleteFileMutation = useMutation({
    mutationFn: softDeleteFile,
    onSuccess: invalidateCurrent,
  });
  const toggleLockMutation = useMutation({
    mutationFn: ({ id, locked }: { id: string; locked: boolean }) => toggleFolderLock(id, locked),
    onSuccess: invalidateCurrent,
  });

  const { data: favoriteIds } = useFavoriteIds(currentUserId);

  function invalidateFavorites() {
    queryClient.invalidateQueries({ queryKey: ["favoriteIds", currentUserId] });
    queryClient.invalidateQueries({ queryKey: ["favorites", currentUserId] });
  }

  const favoriteFolderMutation = useMutation({
    mutationFn: (folder: Folder) =>
      favoriteIds?.folderIds.has(folder.id)
        ? removeFavoriteFolder(currentUserId, folder.id)
        : addFavoriteFolder(currentUserId, folder.id),
    onSuccess: invalidateFavorites,
  });
  const favoriteFileMutation = useMutation({
    mutationFn: (file: FileRow) =>
      favoriteIds?.fileIds.has(file.id)
        ? removeFavoriteFile(currentUserId, file.id)
        : addFavoriteFile(currentUserId, file.id),
    onSuccess: invalidateFavorites,
  });

  if (folders.length === 0 && files.length === 0) {
    return (
      <EmptyState
        title="Esta pasta esta vazia"
        description="Envie arquivos ou crie uma nova pasta para comecar."
      />
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 pb-2">
        <span className="eyebrow flex-1 text-brand-gray">Nome</span>
        <span className="eyebrow hidden w-28 shrink-0 text-right text-brand-gray sm:block">Modificado</span>
        <span className="eyebrow hidden w-20 shrink-0 text-right text-brand-gray sm:block">Tamanho</span>
        <span className="w-7 shrink-0" />
      </div>

      <div className="file-list">
        {folders.map((folder) => (
          <div key={folder.id} className="file-row group" onDoubleClick={() => onOpenFolder(folder)}>
            <span className="file-row-icon text-brand-primary">📁</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {favoriteIds?.folderIds.has(folder.id) && (
                <StarIcon className="h-3.5 w-3.5 shrink-0 text-brand-primary" fill="currentColor" />
              )}
              {folder.is_locked && (
                <LockIcon className="h-3.5 w-3.5 shrink-0 text-brand-gray" />
              )}
              <span className="truncate text-sm font-medium text-brand-black dark:text-white">{folder.name}</span>
            </span>
            <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-brand-gray sm:block">
              {formatRelativeTime(folder.updated_at)}
            </span>
            <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-brand-gray sm:block">
              —
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === folder.id ? null : folder.id);
              }}
              data-item-menu-trigger
              className="shrink-0 rounded-md px-1.5 py-0.5 text-brand-gray opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100 dark:hover:bg-white/10"
              aria-label="Mais opcoes"
            >
              ⋮
            </button>
            <ItemMenu
              onOpen={openMenuId === folder.id}
              onClose={() => setOpenMenuId(null)}
              onRename={
                userRole === "guest" && !!folder.repository_id && folder.is_locked
                  ? undefined
                  : () => setDialog({ kind: "rename-folder", folder })
              }
              onMove={
                userRole === "guest" && !!folder.repository_id && folder.is_locked
                  ? undefined
                  : () => setDialog({ kind: "move-folder", folder })
              }
              onShare={
                userRole === "guest" && !!folder.repository_id && folder.is_locked
                  ? undefined
                  : () => setDialog({ kind: "share-folder", folder })
              }
              onToggleFavorite={() => favoriteFolderMutation.mutate(folder)}
              isFavorited={!!favoriteIds?.folderIds.has(folder.id)}
              onToggleLock={
                folder.repository_id && isManager
                  ? () => toggleLockMutation.mutate({ id: folder.id, locked: !folder.is_locked })
                  : undefined
              }
              isLocked={folder.is_locked}
              onDelete={
                !(userRole === "guest" && !!folder.repository_id && folder.is_locked) &&
                canDelete(folder.owner_id, folder.is_locked)
                  ? () => deleteFolderMutation.mutate(folder.id)
                  : undefined
              }
            />
          </div>
        ))}

        {files.map((file) => (
          <div
            key={file.id}
            className="file-row group"
            onDoubleClick={() =>
              isPreviewable(file.mime_type) ? setDialog({ kind: "preview", file }) : downloadFile(file)
            }
          >
            <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-9 w-9 shrink-0 rounded-lg" />
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {favoriteIds?.fileIds.has(file.id) && (
                <StarIcon className="h-3.5 w-3.5 shrink-0 text-brand-primary" fill="currentColor" />
              )}
              <span className="truncate text-sm font-medium text-brand-black dark:text-white">{file.name}</span>
            </span>
            <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-brand-gray sm:block">
              {formatRelativeTime(file.updated_at)}
            </span>
            <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-brand-gray sm:block">
              {formatBytes(file.size_bytes)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === file.id ? null : file.id);
              }}
              data-item-menu-trigger
              className="shrink-0 rounded-md px-1.5 py-0.5 text-brand-gray opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100 dark:hover:bg-white/10"
              aria-label="Mais opcoes"
            >
              ⋮
            </button>
            <ItemMenu
              onOpen={openMenuId === file.id}
              onClose={() => setOpenMenuId(null)}
              onRename={() => setDialog({ kind: "rename-file", file })}
              onMove={() => setDialog({ kind: "move-file", file })}
              onShare={() => setDialog({ kind: "share-file", file })}
              onDownload={() => downloadFile(file)}
              onToggleFavorite={() => favoriteFileMutation.mutate(file)}
              isFavorited={!!favoriteIds?.fileIds.has(file.id)}
              onDelete={canDelete(file.owner_id) ? () => deleteFileMutation.mutate(file.id) : undefined}
            />
          </div>
        ))}
      </div>

      {dialog?.kind === "rename-folder" && (
        <RenameDialog
          title="Renomear pasta"
          currentName={dialog.folder.name}
          invalidateKeys={[["folderChildren", currentFolderId]]}
          onRename={(name) => renameFolder(dialog.folder.id, name)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "rename-file" && (
        <RenameDialog
          title="Renomear arquivo"
          currentName={dialog.file.name}
          invalidateKeys={[["files", currentFolderId]]}
          onRename={(name) => renameFile(dialog.file.id, name)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "move-folder" && (
        <MoveDialog
          title="Mover pasta"
          excludeFolderId={dialog.folder.id}
          invalidateKeys={[["folderChildren", currentFolderId], ["folderChildren", dialog.folder.id]]}
          onMove={(targetId) => moveFolder(dialog.folder.id, targetId)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "move-file" && (
        <MoveDialog
          title="Mover arquivo"
          invalidateKeys={[["files", currentFolderId]]}
          onMove={(targetId) => moveFile(dialog.file.id, targetId)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "share-folder" && (
        <ShareDialog
          target={{ kind: "folder", folder: dialog.folder }}
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "share-file" && (
        <ShareDialog
          target={{ kind: "file", file: dialog.file }}
          currentUserId={currentUserId}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "preview" && (
        <PreviewModal file={dialog.file} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
