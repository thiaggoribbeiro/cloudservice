import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Folder, FileRow } from "../../types/domain";
import { formatBytes, fileIconFor, isPreviewable } from "../../lib/format";
import { downloadFile, renameFile, moveFile } from "./fileApi";
import { renameFolder, moveFolder } from "../folders/folderApi";
import { softDeleteFolder, softDeleteFile } from "../trash/trashApi";
import {
  addFavoriteFile,
  addFavoriteFolder,
  removeFavoriteFile,
  removeFavoriteFolder,
} from "../favorites/favoritesApi";
import { useFavoriteIds } from "../favorites/useFavoriteIds";
import { StarIcon } from "../../components/ui/icons";
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
  onDelete,
  onOpen,
  onClose,
}: {
  onRename: () => void;
  onMove: () => void;
  onShare: () => void;
  onDownload?: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
  onDelete: () => void;
  onOpen: boolean;
  onClose: () => void;
}) {
  if (!onOpen) return null;
  return (
    <div
      data-item-menu
      className="stagger-0 absolute right-2 top-11 z-10 w-48 overflow-hidden rounded-lg border border-brand-border bg-white py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.35)]"
      onClick={(e) => e.stopPropagation()}
    >
      {onDownload && (
        <button
          type="button"
          onClick={() => {
            onDownload();
            onClose();
          }}
          className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
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
        className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
      >
        {isFavorited ? "Remover dos favoritos" : "Favoritar"}
      </button>
      <button
        type="button"
        onClick={() => {
          onShare();
          onClose();
        }}
        className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
      >
        Compartilhar
      </button>
      <button
        type="button"
        onClick={() => {
          onRename();
          onClose();
        }}
        className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
      >
        Renomear
      </button>
      <button
        type="button"
        onClick={() => {
          onMove();
          onClose();
        }}
        className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
      >
        Mover
      </button>
      <div className="my-1 border-t border-brand-border" />
      <button
        type="button"
        onClick={() => {
          onDelete();
          onClose();
        }}
        className="block w-full px-3.5 py-2 text-left text-sm text-brand-primary transition-colors hover:bg-brand-pale/50"
      >
        Mover para lixeira
      </button>
    </div>
  );
}

export function FileGrid({
  folders,
  files,
  currentFolderId,
  currentUserId,
  onOpenFolder,
}: {
  folders: Folder[];
  files: FileRow[];
  currentFolderId: string | null;
  currentUserId: string;
  onOpenFolder: (folder: Folder) => void;
}) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const queryClient = useQueryClient();

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
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="tile group"
            onDoubleClick={() => onOpenFolder(folder)}
          >
            <span className="tile-icon text-brand-primary">📁</span>
            {favoriteIds?.folderIds.has(folder.id) && (
              <StarIcon
                className="absolute left-2 top-2 h-3.5 w-3.5 text-brand-primary"
                fill="currentColor"
              />
            )}
            <span className="w-full truncate text-center text-sm font-medium text-brand-black">
              {folder.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === folder.id ? null : folder.id);
              }}
              data-item-menu-trigger
              className="absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-brand-gray opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100"
              aria-label="Mais opcoes"
            >
              ⋮
            </button>
            <ItemMenu
              onOpen={openMenuId === folder.id}
              onClose={() => setOpenMenuId(null)}
              onRename={() => setDialog({ kind: "rename-folder", folder })}
              onMove={() => setDialog({ kind: "move-folder", folder })}
              onShare={() => setDialog({ kind: "share-folder", folder })}
              onToggleFavorite={() => favoriteFolderMutation.mutate(folder)}
              isFavorited={!!favoriteIds?.folderIds.has(folder.id)}
              onDelete={() => deleteFolderMutation.mutate(folder.id)}
            />
          </div>
        ))}

        {files.map((file) => (
          <div
            key={file.id}
            className="tile group"
            onDoubleClick={() =>
              isPreviewable(file.mime_type) ? setDialog({ kind: "preview", file }) : downloadFile(file)
            }
          >
            <span className="tile-icon">{fileIconFor(file.mime_type)}</span>
            {favoriteIds?.fileIds.has(file.id) && (
              <StarIcon
                className="absolute left-2 top-2 h-3.5 w-3.5 text-brand-primary"
                fill="currentColor"
              />
            )}
            <span className="w-full truncate text-center text-sm font-medium text-brand-black">
              {file.name}
            </span>
            <span className="mono-tag text-[11px] text-brand-gray">{formatBytes(file.size_bytes)}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === file.id ? null : file.id);
              }}
              data-item-menu-trigger
              className="absolute right-1.5 top-1.5 rounded-md px-1.5 py-0.5 text-brand-gray opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100"
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
              onDelete={() => deleteFileMutation.mutate(file.id)}
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
