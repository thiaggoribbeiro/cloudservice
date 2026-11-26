import { useEffect, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Folder, FileRow, UserRole } from "../../types/domain";
import { formatBytes, isPreviewable, formatRelativeTime, isImageFile } from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { downloadFile, downloadFolder, renameFile, moveFile } from "./fileApi";
import { renameFolder, moveFolder, toggleFolderLock, getFolderSize, getFoldersLastModified } from "../folders/folderApi";
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
import { FileThumbnail } from "./FileThumbnail";
import type { ViewMode } from "./viewMode";

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
  onClick: (e: MouseEvent) => void;
  disabled?: boolean;
  active?: boolean;
  title: string;
  children: ReactNode;
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
      } ${disabled ? "" : "hover:bg-light-surface-container hover:text-light-on-surface"}`}
    >
      {children}
    </button>
  );
}

// A folder's size isn't stored - it's the recursive sum of every file inside
// it, so it needs its own query per row rather than coming for free with the
// folder listing (which files already carry via size_bytes).
function useFolderSize(folderId: string) {
  return useQuery({
    queryKey: ["folderSize", folderId],
    queryFn: () => getFolderSize(folderId),
    staleTime: 60_000,
  });
}

function FolderSizeCell({ folderId }: { folderId: string }) {
  const { data } = useFolderSize(folderId);
  return (
    <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
      {data === undefined ? "…" : formatBytes(data)}
    </span>
  );
}

function FolderSizeText({ folderId }: { folderId: string }) {
  const { data } = useFolderSize(folderId);
  return <>{data === undefined ? "…" : formatBytes(data)}</>;
}

type MenuActions = {
  onDownload?: () => void;
  downloadLabel?: string;
  onToggleLock?: () => void;
  lockLabel?: string;
  onRename?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
  onToggleFavorite: () => void;
  isFavorited: boolean;
};

function ItemMenu({
  open,
  onClose,
  actions,
  className = "right-2 top-full mt-1",
}: {
  open: boolean;
  onClose: () => void;
  actions: MenuActions;
  className?: string;
}) {
  if (!open) return null;
  const { onDownload, downloadLabel, onToggleLock, lockLabel, onRename, onMove, onDelete, onToggleFavorite, isFavorited } =
    actions;

  function run(action: () => void) {
    return () => {
      action();
      onClose();
    };
  }

  return (
    <div
      data-item-menu
      role="menu"
      className={`menu-surface absolute z-20 w-52 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {onDownload && (
        <button type="button" role="menuitem" onClick={run(onDownload)} className="menu-item">
          {downloadLabel ?? "Baixar"}
        </button>
      )}
      <button type="button" role="menuitem" onClick={run(onToggleFavorite)} className="menu-item">
        {isFavorited ? "Remover dos favoritos" : "Favoritar"}
      </button>
      {onToggleLock && (
        <button type="button" role="menuitem" onClick={run(onToggleLock)} className="menu-item">
          {lockLabel}
        </button>
      )}
      {onRename && (
        <button type="button" role="menuitem" onClick={run(onRename)} className="menu-item">
          Renomear
        </button>
      )}
      {onMove && (
        <button type="button" role="menuitem" onClick={run(onMove)} className="menu-item">
          Mover
        </button>
      )}
      {onDelete && (
        <>
          <div className="my-1 border-t border-light-outline-variant" role="separator" />
          <button type="button" role="menuitem" onClick={run(onDelete)} className="menu-item menu-item-danger">
            Mover para lixeira
          </button>
        </>
      )}
    </div>
  );
}

// ---- Grid (icon / photo) views ------------------------------------------

const GRID_COLUMNS: Record<Exclude<ViewMode, "details">, string> = {
  small: "grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2",
  medium: "grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3",
  large: "grid-cols-[repeat(auto-fill,minmax(184px,1fr))] gap-gutter-md",
  photos: "grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-gutter-md",
};

// One tile in any of the grid views. Folders open on click (same as the
// details list); files open on double-click, except images in "Fotos",
// where a single click opens the viewer - that's what browsing photos is.
function GridTile({
  mode,
  name,
  visual,
  meta,
  isFavorited,
  isLocked,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onToggleFavorite,
  onActivate,
  activateOnClick,
  actions,
}: {
  mode: Exclude<ViewMode, "details">;
  name: string;
  visual: ReactNode;
  meta?: ReactNode;
  isFavorited: boolean;
  isLocked?: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onToggleFavorite: () => void;
  onActivate: () => void;
  activateOnClick: boolean;
  actions: MenuActions;
}) {
  function handleKey(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  }

  // Hidden-until-hover controls. Small tiles are one line, so there they
  // must not take any width while hidden; elsewhere they float over the tile.
  const revealClass =
    mode === "small"
      ? "flex sm:hidden sm:group-hover:flex sm:group-focus-within:flex"
      : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100";

  const menuButton = (
    <button
      type="button"
      data-item-menu-trigger
      onClick={(e) => {
        e.stopPropagation();
        onToggleMenu();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={`Mais opções para ${name}`}
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      className={`btn-icon h-8 w-8 shrink-0 ${
        mode === "small" ? "" : "bg-light-surface-container-lowest/90 shadow-sm backdrop-blur-sm"
      } ${menuOpen ? "flex opacity-100" : revealClass}`}
    >
      <MoreIcon className="h-5 w-5" />
    </button>
  );

  const favoriteButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggleFavorite();
      }}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={isFavorited ? `Remover ${name} dos favoritos` : `Favoritar ${name}`}
      aria-pressed={isFavorited}
      className={`btn-icon h-8 w-8 shrink-0 ${
        mode === "small" ? "" : "bg-light-surface-container-lowest/90 shadow-sm backdrop-blur-sm"
      } ${isFavorited ? "text-light-primary hover:text-light-primary" : revealClass}`}
    >
      <StarIcon className="h-[18px] w-[18px]" filled={isFavorited} />
    </button>
  );

  const common = {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": name,
    onKeyDown: handleKey,
    onClick: activateOnClick ? onActivate : undefined,
    onDoubleClick: activateOnClick ? undefined : onActivate,
  };

  const menu = (
    <ItemMenu
      open={menuOpen}
      onClose={onCloseMenu}
      actions={actions}
      className={mode === "small" ? "right-2 top-full mt-1" : "right-2 top-11"}
    />
  );

  if (mode === "small") {
    return (
      <div
        {...common}
        className="group relative flex min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border border-light-outline-variant bg-light-surface-container-lowest py-1.5 pl-2.5 pr-1 transition-colors duration-state-change hover:border-light-primary hover:bg-light-surface-container-low"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">{visual}</span>
        <span className="min-w-0 flex-1 truncate font-body text-body-md text-light-on-surface" title={name}>
          {name}
        </span>
        {isLocked && <LockIcon className="h-4 w-4 text-light-on-surface-variant" />}
        {favoriteButton}
        {menuButton}
        {menu}
      </div>
    );
  }

  if (mode === "photos") {
    return (
      <div
        {...common}
        className="group relative flex min-w-0 cursor-pointer flex-col overflow-visible rounded-2xl border border-light-outline-variant bg-light-surface-container-lowest shadow-sm transition-all duration-state-change ease-state-change hover:-translate-y-0.5 hover:border-light-primary hover:shadow-md"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-light-surface-container-low">
          {visual}
        </div>
        <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-label text-label-lg text-light-on-surface" title={name}>
              {name}
            </p>
            {meta && <p className="truncate font-body text-body-sm text-light-on-surface-variant">{meta}</p>}
          </div>
          {isLocked && <LockIcon className="h-4 w-4 text-light-on-surface-variant" />}
        </div>
        <div className="absolute left-2 top-2">{favoriteButton}</div>
        <div className="absolute right-2 top-2">{menuButton}</div>
        {menu}
      </div>
    );
  }

  // medium / large: Explorer-style icon tile, name below.
  const large = mode === "large";
  return (
    <div
      {...common}
      className={`group relative flex min-w-0 cursor-pointer flex-col items-center rounded-2xl border border-transparent text-center transition-colors duration-state-change hover:border-light-outline-variant hover:bg-light-surface-container-lowest hover:shadow-sm ${
        large ? "gap-2 p-3" : "gap-1.5 p-2.5"
      }`}
    >
      <div
        className={`relative flex w-full items-center justify-center overflow-hidden rounded-xl ${large ? "h-36" : "h-[88px]"}`}
      >
        {visual}
      </div>
      <p
        className={`line-clamp-2 w-full break-words font-body text-light-on-surface ${large ? "text-body-md" : "text-body-sm"}`}
        title={name}
      >
        {name}
      </p>
      {large && meta && <p className="w-full truncate font-body text-body-sm text-light-on-surface-variant">{meta}</p>}
      <div className="absolute left-1.5 top-1.5 flex items-center gap-1">
        {favoriteButton}
        {isLocked && (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-light-surface-container-lowest/90 text-light-on-surface-variant shadow-sm"
            title="Pasta travada"
          >
            <LockIcon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="absolute right-1.5 top-1.5">{menuButton}</div>
      {menu}
    </div>
  );
}

export function FileGrid({
  folders,
  files,
  currentFolderId,
  currentUserId,
  userRole,
  viewMode = "details",
  onOpenFolder,
}: {
  folders: Folder[];
  files: FileRow[];
  currentFolderId: string | null;
  currentUserId: string;
  userRole: UserRole;
  viewMode?: ViewMode;
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

    function handlePointerDown(event: globalThis.MouseEvent) {
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
    queryClient.invalidateQueries({ queryKey: ["folderLastModified"] });
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

  // A folder's "Modificado por/Modificado" is the latest change anywhere
  // inside it, not the folder row's own stamp. If the lookup fails (e.g.
  // the database function isn't deployed yet) we fall back to the row.
  const folderIds = folders.map((folder) => folder.id);
  const { data: folderLastModified } = useQuery({
    queryKey: ["folderLastModified", folderIds],
    queryFn: () => getFoldersLastModified(folderIds),
    enabled: folderIds.length > 0,
    staleTime: 30_000,
    retry: false,
  });

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

  // Previewable files in on-screen order, so the viewer can step through
  // them with the arrows (photo browsing).
  const previewableFiles = files.filter((file) => isPreviewable(file.mime_type));

  function openFile(file: FileRow) {
    if (isPreviewable(file.mime_type)) setDialog({ kind: "preview", file });
    else downloadFile(file);
  }

  // Guests can't touch a locked repository folder's contents.
  function guestLocked(folder: Folder) {
    return userRole === "guest" && !!folder.repository_id && folder.is_locked;
  }

  function folderActions(folder: Folder): MenuActions {
    const locked = guestLocked(folder);
    return {
      isFavorited: !!favoriteIds?.folderIds.has(folder.id),
      onToggleFavorite: () => favoriteFolderMutation.mutate(folder),
      onDownload: () => downloadFolderMutation.mutate(folder),
      downloadLabel: "Baixar pasta (.zip)",
      onToggleLock:
        folder.repository_id && isManager
          ? () => toggleLockMutation.mutate({ id: folder.id, locked: !folder.is_locked })
          : undefined,
      lockLabel: folder.is_locked ? "Destravar pasta" : "Travar pasta",
      onRename: locked ? undefined : () => setDialog({ kind: "rename-folder", folder }),
      onMove: locked ? undefined : () => setDialog({ kind: "move-folder", folder }),
      onDelete:
        !locked && canDelete(folder.owner_id, folder.is_locked)
          ? () => deleteFolderMutation.mutate(folder.id)
          : undefined,
    };
  }

  function fileActions(file: FileRow): MenuActions {
    // Rename/move are limited to the file's owner (or admin/manager) -
    // otherwise any member of a shared/repository folder could rename
    // or relocate files they never uploaded, which is exactly the gap
    // this restriction closes. Delete already followed this rule.
    const canManageFile = canDelete(file.owner_id);
    return {
      isFavorited: !!favoriteIds?.fileIds.has(file.id),
      onToggleFavorite: () => favoriteFileMutation.mutate(file),
      onDownload: () => downloadFile(file),
      onRename: canManageFile ? () => setDialog({ kind: "rename-file", file }) : undefined,
      onMove: canManageFile ? () => setDialog({ kind: "move-file", file }) : undefined,
      onDelete: canManageFile ? () => deleteFileMutation.mutate(file.id) : undefined,
    };
  }

  function toggleMenu(id: string) {
    setOpenMenuId((current) => (current === id ? null : id));
  }

  if (folders.length === 0 && files.length === 0) {
    return (
      <EmptyState
        title="Esta pasta está vazia"
        description="Envie arquivos ou crie uma nova pasta para começar."
      />
    );
  }

  const dialogs = (
    <>
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
        <PreviewModal
          file={dialog.file}
          siblings={previewableFiles}
          onNavigate={(file) => setDialog({ kind: "preview", file })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );

  if (viewMode !== "details") {
    const mode = viewMode;
    const folderVisual = (
      <FolderTileIcon
        className={mode === "small" || mode === "photos" ? "h-8 w-8" : mode === "medium" ? "h-16 w-16" : "h-24 w-24"}
      />
    );

    const folderTiles = folders.map((folder) => {
      const actions = folderActions(folder);
      const lastModified = folderLastModified?.get(folder.id);
      return (
        <GridTile
          key={folder.id}
          mode={mode === "photos" ? "small" : mode}
          name={folder.name}
          visual={folderVisual}
          meta={
            <>
              <FolderSizeText folderId={folder.id} /> · {formatRelativeTime(lastModified?.updatedAt ?? folder.updated_at)}
            </>
          }
          isFavorited={actions.isFavorited}
          isLocked={!!folder.repository_id && folder.is_locked}
          menuOpen={openMenuId === folder.id}
          onToggleMenu={() => toggleMenu(folder.id)}
          onCloseMenu={() => setOpenMenuId(null)}
          onToggleFavorite={actions.onToggleFavorite}
          onActivate={() => onOpenFolder(folder)}
          activateOnClick
          actions={actions}
        />
      );
    });

    const fileTiles = files.map((file) => {
      const actions = fileActions(file);
      const image = isImageFile(file);
      let visual: ReactNode;
      if (mode === "small") {
        visual = <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-8 w-8" />;
      } else if (mode === "photos") {
        visual = <FileThumbnail file={file} width={480} iconClassName="h-16 w-16" className="h-full w-full" />;
      } else {
        const large = mode === "large";
        visual = image ? (
          <FileThumbnail
            file={file}
            width={large ? 320 : 176}
            iconClassName={large ? "h-24 w-24" : "h-16 w-16"}
            className="h-full w-full rounded-xl bg-light-surface-container-low"
          />
        ) : (
          <FileTypeIcon name={file.name} mimeType={file.mime_type} className={large ? "h-24 w-24" : "h-16 w-16"} />
        );
      }
      return (
        <GridTile
          key={file.id}
          mode={mode}
          name={file.name}
          visual={visual}
          meta={`${formatBytes(file.size_bytes)} · ${formatRelativeTime(file.updated_at)}`}
          isFavorited={actions.isFavorited}
          menuOpen={openMenuId === file.id}
          onToggleMenu={() => toggleMenu(file.id)}
          onCloseMenu={() => setOpenMenuId(null)}
          onToggleFavorite={actions.onToggleFavorite}
          onActivate={() => openFile(file)}
          activateOnClick={mode === "photos" && image}
          actions={actions}
        />
      );
    });

    // In "Fotos" the folders sit in a compact strip above the photo wall,
    // so they don't break up the grid of pictures with giant folder cards.
    if (mode === "photos") {
      return (
        <>
          {folderTiles.length > 0 && (
            <section aria-label="Pastas" className="mb-gutter-lg">
              <h2 className="mb-2 font-label text-label-md text-light-on-surface-variant">Pastas</h2>
              <div className={`grid ${GRID_COLUMNS.small}`}>{folderTiles}</div>
            </section>
          )}
          {fileTiles.length > 0 && (
            <section aria-label="Arquivos">
              {folderTiles.length > 0 && (
                <h2 className="mb-2 font-label text-label-md text-light-on-surface-variant">Arquivos</h2>
              )}
              <div className={`grid ${GRID_COLUMNS.photos}`}>{fileTiles}</div>
            </section>
          )}
          {dialogs}
        </>
      );
    }

    return (
      <>
        <div className={`grid ${GRID_COLUMNS[mode]}`}>
          {folderTiles}
          {fileTiles}
        </div>
        {dialogs}
      </>
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
          const actions = folderActions(folder);
          const isFavorited = actions.isFavorited;
          const lastModified = folderLastModified?.get(folder.id);
          const isDownloading =
            downloadFolderMutation.isPending && downloadFolderMutation.variables?.id === folder.id;

          return (
            <div key={folder.id} className="file-row" onClick={() => onOpenFolder(folder)}>
              <FolderTileIcon className="h-9 w-9 shrink-0" />
              <span className="mr-2 flex min-w-0 flex-1 items-center sm:mr-3">
                <span className="truncate font-body text-body-md text-light-on-surface">{folder.name}</span>
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
                {modifiedByLabel(lastModified ? lastModified.updatedBy : folder.updated_by)}
              </span>
              <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                {formatRelativeTime(lastModified?.updatedAt ?? folder.updated_at)}
              </span>
              <FolderSizeCell folderId={folder.id} />

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleMenu(folder.id);
                }}
                data-item-menu-trigger
                className="btn-icon ml-1 h-8 w-8"
                aria-label="Mais opções"
              >
                <MoreIcon className="h-5 w-5" />
              </button>
              <ItemMenu
                open={openMenuId === folder.id}
                onClose={() => setOpenMenuId(null)}
                // The row already has inline download/lock buttons.
                actions={{ ...actions, onDownload: undefined, onToggleLock: undefined }}
              />
            </div>
          );
        })}

        {files.map((file) => {
          const actions = fileActions(file);
          const isFavorited = actions.isFavorited;

          return (
            <div key={file.id} className="file-row" onDoubleClick={() => openFile(file)}>
              <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-9 w-9 shrink-0" />
              <span className="mr-2 flex min-w-0 flex-1 items-center sm:mr-3">
                <span className="truncate font-body text-body-md text-light-on-surface">{file.name}</span>
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
                  toggleMenu(file.id);
                }}
                data-item-menu-trigger
                className="btn-icon ml-1 h-8 w-8"
                aria-label="Mais opções"
              >
                <MoreIcon className="h-5 w-5" />
              </button>
              <ItemMenu
                open={openMenuId === file.id}
                onClose={() => setOpenMenuId(null)}
                actions={{ ...actions, onDownload: undefined }}
              />
            </div>
          );
        })}
      </div>

      {dialogs}
    </>
  );
}
