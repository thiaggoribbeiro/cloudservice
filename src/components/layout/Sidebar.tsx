import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StorageUsageIndicator } from "../../features/storageUsage/StorageUsageIndicator";
import { CreateFolderDialog } from "../../features/folders/CreateFolderDialog";
import { ShareDialog } from "../../features/sharing/ShareDialog";
import { uploadFile, uploadFolderFiles } from "../../features/files/fileApi";
import {
  PlusIcon,
  UploadFileIcon,
  UploadFolderIcon,
  HomeIcon,
  FolderIcon,
  ShareIcon,
  StarIcon,
  TrashIcon,
  UsersIcon,
  RepositoryIcon,
} from "../ui/icons";
import type { CreateActionTarget, Folder, UserRole, ViewSelection } from "../../types/domain";

function NavRow({
  icon,
  active,
  onClick,
  children,
}: {
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex w-full items-center gap-2.5 rounded-md py-2 pl-3 pr-2 text-left text-[0.9rem] transition-colors ${
        active
          ? "bg-white font-semibold text-brand-primary shadow-sm dark:bg-white/12 dark:text-white dark:shadow-none"
          : "text-brand-black/70 hover:bg-black/5 hover:text-brand-black dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-primary" />
      )}
      <span className="shrink-0 opacity-90">{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  );
}

export function Sidebar({
  view,
  path,
  userId,
  role,
  actionTarget,
  onNavigateFolder,
  onSelectHome,
  onSelectShared,
  onSelectFavorites,
  onSelectTrash,
  onSelectMembers,
  onSelectRepositories,
}: {
  view: ViewSelection;
  path: Folder[];
  userId: string;
  role: UserRole;
  actionTarget?: CreateActionTarget | null;
  onNavigateFolder: (path: Folder[]) => void;
  onSelectHome: () => void;
  onSelectShared: () => void;
  onSelectFavorites: () => void;
  onSelectTrash: () => void;
  onSelectMembers: () => void;
  onSelectRepositories: () => void;
}) {
  const currentFolderId = path.length ? path[path.length - 1].id : null;
  const isMyDrive = view.kind === "folder";
  const uploadTargetFolderId =
    actionTarget === undefined ? (isMyDrive ? currentFolderId : null) : actionTarget?.folderId ?? null;
  const isGuest = role === "guest";
  const canManageMembers = role === "admin" || role === "manager";
  const hasContextualTarget = actionTarget !== undefined && actionTarget !== null;
  const canUseCreateMenu = !isGuest || hasContextualTarget;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateSharedFolder, setShowCreateSharedFolder] = useState(false);
  const [shareTarget, setShareTarget] = useState<Folder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-item-menu]") || target.closest("[data-item-menu-trigger]")) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  function invalidateAfterUpload() {
    queryClient.invalidateQueries({ queryKey: ["folderChildren"] });
    queryClient.invalidateQueries({ queryKey: ["files"] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
    queryClient.invalidateQueries({ queryKey: ["repositoryUsage"] });
  }

  async function handleFilesSelected(fileList: FileList) {
    for (const file of Array.from(fileList)) {
      await uploadFile(file, uploadTargetFolderId, userId);
    }
    invalidateAfterUpload();
  }

  async function handleFolderSelected(fileList: FileList) {
    await uploadFolderFiles(fileList, uploadTargetFolderId, userId);
    invalidateAfterUpload();
  }

  const createFolderInvalidateKeys = [["folderChildren", uploadTargetFolderId]];

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-light-canvas pt-4 dark:bg-dark-canvas">
      {canUseCreateMenu && (
        <div className="relative px-3 pb-4">
          <button
            type="button"
            data-item-menu-trigger
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-4/5 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-linear-to-br from-brand-secondary to-[#7f3712] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-px hover:shadow-md"
          >
            <PlusIcon className="h-4 w-4" />
            Criar ou carregar
          </button>

          {menuOpen && (
            <div
              data-item-menu
              className="stagger-0 absolute left-3 right-3 top-full z-20 mt-1.5 overflow-hidden rounded-lg border border-brand-border bg-white py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)] dark:border-white/10 dark:bg-dark-surface"
            >
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
              >
                <UploadFileIcon className="h-[18px] w-[18px] text-brand-gray" />
                Carregamento de arquivos
              </button>
              <button
                type="button"
                onClick={() => {
                  folderInputRef.current?.click();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
              >
                <UploadFolderIcon className="h-[18px] w-[18px] text-brand-gray" />
                Carregamento de pasta
              </button>
              <div className="my-1 border-t border-brand-border dark:border-white/10" />
              <button
                type="button"
                onClick={() => {
                  setShowCreateFolder(true);
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
              >
                <FolderIcon className="h-[18px] w-[18px] text-brand-gray" />
                Criar pasta
              </button>
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSharedFolder(true);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
                >
                  <UsersIcon className="h-[18px] w-[18px] text-brand-gray" />
                  Criar pasta compartilhada
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            aria-label="Carregamento de arquivos"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFilesSelected(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            aria-label="Carregamento de pasta"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFolderSelected(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3">
        {!isGuest && (
          <>
            <NavRow icon={<HomeIcon className="h-[18px] w-[18px]" />} active={view.kind === "home"} onClick={onSelectHome}>
              Pagina inicial
            </NavRow>

            <div className="mt-0.5">
              <NavRow
                icon={<FolderIcon className="h-[18px] w-[18px]" />}
                active={isMyDrive}
                onClick={() => onNavigateFolder([])}
              >
                Meus arquivos
              </NavRow>
            </div>

            {canManageMembers && (
              <div className="mt-0.5">
                <NavRow
                  icon={<RepositoryIcon className="h-[18px] w-[18px]" />}
                  active={view.kind === "repositories"}
                  onClick={onSelectRepositories}
                >
                  Repositorios
                </NavRow>
              </div>
            )}
          </>
        )}

        <div className="mt-3 flex flex-col gap-0.5">
          <NavRow icon={<ShareIcon className="h-[18px] w-[18px]" />} active={view.kind === "shared"} onClick={onSelectShared}>
            Compartilhado comigo
          </NavRow>
          {!isGuest && (
            <>
              <NavRow icon={<StarIcon className="h-[18px] w-[18px]" />} active={view.kind === "favorites"} onClick={onSelectFavorites}>
                Favoritos
              </NavRow>
              <NavRow icon={<TrashIcon className="h-[18px] w-[18px]" />} active={view.kind === "trash"} onClick={onSelectTrash}>
                Lixeira
              </NavRow>
            </>
          )}
          {canManageMembers && (
            <NavRow icon={<UsersIcon className="h-[18px] w-[18px]" />} active={view.kind === "members"} onClick={onSelectMembers}>
              Membros
            </NavRow>
          )}
        </div>
      </nav>

      {!isGuest && <StorageUsageIndicator userId={userId} />}

      {showCreateFolder && (
        <CreateFolderDialog
          title="Nova pasta"
          parentId={uploadTargetFolderId}
          ownerId={userId}
          invalidateKeys={createFolderInvalidateKeys}
          allowLock={actionTarget?.allowLock}
          onCreated={() => setShowCreateFolder(false)}
          onClose={() => setShowCreateFolder(false)}
        />
      )}

      {showCreateSharedFolder && (
        <CreateFolderDialog
          title="Nova pasta compartilhada"
          parentId={uploadTargetFolderId}
          ownerId={userId}
          invalidateKeys={createFolderInvalidateKeys}
          allowLock={actionTarget?.allowLock}
          onCreated={(folder) => {
            setShowCreateSharedFolder(false);
            setShareTarget(folder);
          }}
          onClose={() => setShowCreateSharedFolder(false)}
        />
      )}

      {shareTarget && (
        <ShareDialog
          target={{ kind: "folder", folder: shareTarget }}
          currentUserId={userId}
          onClose={() => setShareTarget(null)}
        />
      )}
    </aside>
  );
}
