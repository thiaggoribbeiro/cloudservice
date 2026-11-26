import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Folder, FileRow, UserRole } from "../../types/domain";
import { formatBytes, isPreviewable, formatRelativeTime } from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { downloadFile, downloadFolder, renameFile, moveFile } from "./fileApi";
import { renameFolder, moveFolder, toggleFolderLock, getFolderSize } from "../folders/folderApi";
import { softDeleteFolder, softDeleteFile } from "../trash/trashApi";
import {
  addFavoriteFile,
  addFavoriteFolder,
  removeFavoriteFile,
  removeFavoriteFolder,
} from "../favorites/favoritesApi";
import { useFavoriteIds } from "../favorites/useFavoriteIds";
import { useDisplayNames } from "../../lib/useDisplayNames";
import { StarIcon, LockIcon, UnlockIcon, DownloadIcon, FolderTileIcon, MoreIcon } from "../../components/ui/icons";
import { RenameDialog } from "../folders/RenameDialog";
import { MoveDialog } from "../folders/MoveDialog";
import { PreviewModal } from "./PreviewModal";
import { EmptyState } from "../../components/ui/EmptyState";

type ActiveDialog =
  | { kind: "rename-folder"; folder: Folder }
  | { kind: "rename-file"; file: FileRow }
  | { kind: "move-folder"; folder: Folder }
  | { kind: "move-file"; file: FileRow }
  | { kind: "preview"; file: FileRow };

// Right-aligned icon cluster shared by folder/file rows - a fixed width so
// the columns after it (modified/size/menu) line up regardless of whether a
// row shows two icons (file: download + favorite) or three (folder: also
// the lock toggle).
function RowActionButton({
  onClick,
  disabled,
  active,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-default disabled:opacity-40 ${
        active ? "text-light-primary" : "text-light-on-surface-variant"
      } ${
        disabled
          ? ""
          : "hover:bg-light-surface-container hover:text-light-on-surface"
      }`}
    >
      {children}
    </button>
  );
}

// A folder's size isn't stored - it's the recursive sum of every file inside
// it, so it needs its own query per row rather than coming for free with the
// folder listing (which files already carry via size_bytes).
function FolderSizeCell({ folderId }: { folderId: string }) {
  const { data } = useQuery({
    queryKey: ["folderSize", folderId],
    queryFn: () => getFolderSize(folderId),
    staleTime: 60_000,
  });

  return (
    <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
      {data === undefined ? "…" : formatBytes(data)}
    </span>
  );
}

function ItemMenu({
  onRename,
  onMove,
  onDelete,
  onToggleFavorite,
  isFavorited,
  onOpen,
  onClose,
}: {
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
  onOpen: boolean;
  onClose: () => void;
}) {
  if (!onOpen) return null;
  return (
    <div
      data-item-menu
      className="menu-surface absolute right-2 top-full z-10 mt-1 w-52"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => {
          onToggleFavorite();
          onClose();
        }}
        className="menu-item"
      >
        {isFavorited ? "Remover dos favoritos" : "Favoritar"}
      </button>
      {onRename && (
        <button
          type="button"
          onClick={() => {
            onRename();
            onClose();
          }}
          className="menu-item"
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
          className="menu-item"
        >
          Mover
        </button>
      )}
      {onDelete && (
        <>
          <div className="my-1 border-t border-light-outline-variant" role="separator" />
          <button
            type="button"
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="menu-item menu-item-danger"
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
  const downloadFolderMutation = useMutation({ mutationFn: downloadFolder });

  const { data: favoriteIds } = useFavoriteIds(currentUserId);
  const { data: displayNames } = useDisplayNames();

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

  function modifiedByLabel(userId: string | null): string {
    if (!userId) return "—";
    return displayNames?.get(userId) ?? "—";
  }

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
      <div className="file-list-head">
        <span className="flex-1">Nome</span>
        <span className="w-24 shrink-0" />
        <span className="hidden w-32 shrink-0 text-right lg:block">Modificado por</span>
        <span className="hidden w-28 shrink-0 text-right sm:block">Modificado</span>
        <span className="hidden w-20 shrink-0 text-right sm:block">Tamanho</span>
        <span className="w-9 shrink-0" />
      </div>

      <div className="file-list">
        {folders.map((folder) => {
          const isFavorited = !!favoriteIds?.folderIds.has(folder.id);
          const isDownloading =
            downloadFolderMutation.isPending && downloadFolderMutation.variables?.id === folder.id;

          return (
            <div
              key={folder.id}
              className="file-row"
              onClick={() => onOpenFolder(folder)}
            >
              <FolderTileIcon className="h-9 w-9 shrink-0" />
              <span className="mr-2 flex min-w-0 flex-1 items-center sm:mr-3">
                <span className="truncate font-body text-body-md text-light-on-surface">
                  {folder.name}
                </span>
              </span>

              <div className="ml-2 flex w-24 shrink-0 items-center justify-end gap-1">
                {folder.repository_id && (
                  <RowActionButton
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isManager) toggleLockMutation.mutate({ id: folder.id, locked: !folder.is_locked });
                    }}
                    disabled={!isManager}
                    title={
                      isManager
                        ? folder.is_locked
                          ? "Destravar pasta"
                          : "Travar pasta"
                        : folder.is_locked
                          ? "Pasta travada"
                          : "Pasta destravada"
                    }
                  >
                    {folder.is_locked ? <LockIcon className="h-4 w-4" /> : <UnlockIcon className="h-4 w-4" />}
                  </RowActionButton>
                )}
                <RowActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFolderMutation.mutate(folder);
                  }}
                  disabled={isDownloading}
                  title="Baixar pasta (.zip)"
                >
                  <DownloadIcon className="h-4 w-4" />
                </RowActionButton>
                <RowActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    favoriteFolderMutation.mutate(folder);
                  }}
                  active={isFavorited}
                  title={isFavorited ? "Remover dos favoritos" : "Favoritar"}
                >
                  <StarIcon className="h-4 w-4" filled={isFavorited} />
                </RowActionButton>
              </div>

              <span className="hidden w-32 shrink-0 truncate text-right font-body text-body-sm text-light-on-surface-variant lg:block">
                {modifiedByLabel(folder.updated_by)}
              </span>
              <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                {formatRelativeTime(folder.updated_at)}
              </span>
              <FolderSizeCell folderId={folder.id} />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === folder.id ? null : folder.id);
                }}
                data-item-menu-trigger
                className="btn-icon ml-1 h-8 w-8"
                aria-label="Mais opcoes"
              >
                <MoreIcon className="h-5 w-5" />
              </button>
              <ItemMenu
                onOpen={openMenuId === folder.id}
                onClose={() => setOpenMenuId(null)}
                onToggleFavorite={() => favoriteFolderMutation.mutate(folder)}
                isFavorited={isFavorited}
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
                onDelete={
                  !(userRole === "guest" && !!folder.repository_id && folder.is_locked) &&
                  canDelete(folder.owner_id, folder.is_locked)
                    ? () => deleteFolderMutation.mutate(folder.id)
                    : undefined
                }
              />
            </div>
          );
        })}

        {files.map((file) => {
          const isFavorited = !!favoriteIds?.fileIds.has(file.id);
          // Rename/move are limited to the file's owner (or admin/manager) -
          // otherwise any member of a shared/repository folder could rename
          // or relocate files they never uploaded, which is exactly the gap
          // this restriction closes. Delete already followed this rule.
          const canManageFile = canDelete(file.owner_id);

          return (
            <div
              key={file.id}
              className="file-row"
              onDoubleClick={() =>
                isPreviewable(file.mime_type) ? setDialog({ kind: "preview", file }) : downloadFile(file)
              }
            >
              <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-9 w-9 shrink-0" />
              <span className="mr-2 flex min-w-0 flex-1 items-center sm:mr-3">
                <span className="truncate font-body text-body-md text-light-on-surface">
                  {file.name}
                </span>
              </span>

              <div className="ml-2 flex w-24 shrink-0 items-center justify-end gap-1">
                <RowActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(file);
                  }}
                  title="Baixar arquivo"
                >
                  <DownloadIcon className="h-4 w-4" />
                </RowActionButton>
                <RowActionButton
                  onClick={(e) => {
                    e.stopPropagation();
                    favoriteFileMutation.mutate(file);
                  }}
                  active={isFavorited}
                  title={isFavorited ? "Remover dos favoritos" : "Favoritar"}
                >
                  <StarIcon className="h-4 w-4" filled={isFavorited} />
                </RowActionButton>
              </div>

              <span className="hidden w-32 shrink-0 truncate text-right font-body text-body-sm text-light-on-surface-variant lg:block">
                {modifiedByLabel(file.updated_by)}
              </span>
              <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                {formatRelativeTime(file.updated_at)}
              </span>
              <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                {formatBytes(file.size_bytes)}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === file.id ? null : file.id);
                }}
                data-item-menu-trigger
                className="btn-icon ml-1 h-8 w-8"
                aria-label="Mais opcoes"
              >
                <MoreIcon className="h-5 w-5" />
              </button>
              <ItemMenu
                onOpen={openMenuId === file.id}
                onClose={() => setOpenMenuId(null)}
                onToggleFavorite={() => favoriteFileMutation.mutate(file)}
                isFavorited={isFavorited}
                onRename={canManageFile ? () => setDialog({ kind: "rename-file", file }) : undefined}
                onMove={canManageFile ? () => setDialog({ kind: "move-file", file }) : undefined}
                onDelete={canManageFile ? () => deleteFileMutation.mutate(file.id) : undefined}
              />
            </div>
          );
        })}
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
          // Chave parcial ["folderChildren"] invalida a origem e o destino
          // de uma vez (não dá pra saber o id de destino antes da escolha
          // no diálogo) -- mesmo padrão já usado em Sidebar.tsx/TrashView.tsx
          // pra invalidação ampla de ["files"].
          invalidateKeys={[["folderChildren"]]}
          onMove={(targetId) => moveFolder(dialog.folder.id, targetId)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "move-file" && (
        <MoveDialog
          title="Mover arquivo"
          invalidateKeys={[["files"]]}
          onMove={(targetId) => moveFile(dialog.file.id, targetId)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "preview" && (
        <PreviewModal file={dialog.file} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
