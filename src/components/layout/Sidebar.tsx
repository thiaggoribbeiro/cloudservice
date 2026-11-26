import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StorageUsageIndicator } from "../../features/storageUsage/StorageUsageIndicator";
import { CreateFolderDialog } from "../../features/folders/CreateFolderDialog";
import { uploadFile, uploadFolderFiles } from "../../features/files/fileApi";
import { useTheme } from "../../lib/useTheme";
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
  EventLogIcon,
  CloseIcon,
  ChevronDownIcon,
} from "../ui/icons";
import type { CreateActionTarget, Folder, UserRole, ViewSelection } from "../../types/domain";

type IconComponent = ComponentType<{ className?: string; filled?: boolean }>;

function NavRow({
  icon: Icon,
  active,
  onClick,
  children,
}: {
  icon: IconComponent;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left font-label text-label-lg transition-colors duration-state-change ease-state-change ${
        active
          ? "bg-light-secondary-container text-light-on-secondary-container"
          : "text-light-on-surface-variant hover:bg-light-surface-container hover:text-light-on-surface"
      }`}
    >
      <Icon className="h-5 w-5" filled={active} />
      <span className="truncate">{children}</span>
    </button>
  );
}

function NavGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-gutter-xs">
      {label && (
        <p className="px-3 pb-1 pt-2 font-label text-label-sm text-light-outline">{label}</p>
      )}
      {children}
    </div>
  );
}

export function Sidebar({
  open,
  onClose,
  onGoHome,
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
  onSelectEventLog,
}: {
  open: boolean;
  onClose: () => void;
  onGoHome: () => void;
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
  onSelectEventLog: () => void;
}) {
  const { theme } = useTheme();
  const currentFolderId = path.length ? path[path.length - 1].id : null;
  const isMyDrive = view.kind === "folder";
  const uploadTargetFolderId =
    actionTarget === undefined ? (isMyDrive ? currentFolderId : null) : actionTarget?.folderId ?? null;
  const isGuest = role === "guest";
  const canManageMembers = role === "admin" || role === "manager";
  const hasContextualTarget = actionTarget !== undefined && actionTarget !== null;
  const canUseCreateMenu = !isGuest || hasContextualTarget;
  const activeRepositoryId = actionTarget === undefined ? null : actionTarget?.repositoryId ?? null;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
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

  // Off-canvas (below lg) closes with Esc, like every other dialog surface.
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

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

  // Picking a destination on the mobile drawer should also dismiss it.
  function go(action: () => void) {
    return () => {
      action();
      onClose();
    };
  }

  const createFolderInvalidateKeys = [["folderChildren", uploadTargetFolderId]];

  return (
    <>
      {open && (
        <div
          className="animate-fade fixed inset-0 z-40 bg-light-scrim/55 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shrink-0 flex-col border-r border-light-outline-variant bg-light-surface-container-lowest transition-transform duration-surface-enter ease-surface-enter lg:static lg:z-auto lg:w-64 lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-between gap-2 px-5 pb-4 pt-5">
          <button
            type="button"
            onClick={go(onGoHome)}
            className="rounded-lg transition-opacity duration-state-change hover:opacity-80"
            aria-label="Ir para a página inicial"
          >
            <img
              src={theme === "dark" ? "/logo-dark.png" : "/logo-claro.png"}
              alt="Cloud Service - Avesta"
              className="h-10 w-auto"
            />
          </button>
          <button type="button" onClick={onClose} className="btn-icon lg:hidden" aria-label="Fechar menu">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {canUseCreateMenu && (
          <div className="relative px-4 pb-4">
            <button
              type="button"
              data-item-menu-trigger
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="btn-primary w-full py-2.5"
            >
              <PlusIcon className="h-[18px] w-[18px]" />
              Criar ou carregar
              <ChevronDownIcon
                className={`ml-auto h-[18px] w-[18px] transition-transform duration-state-change ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div data-item-menu role="menu" className="menu-surface absolute left-4 right-4 top-full z-20 mt-1.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                  className="menu-item py-2.5"
                >
                  <UploadFileIcon className="h-[18px] w-[18px] text-light-on-surface-variant" />
                  Carregar arquivos
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    folderInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                  className="menu-item py-2.5"
                >
                  <UploadFolderIcon className="h-[18px] w-[18px] text-light-on-surface-variant" />
                  Carregar pasta
                </button>
                <div className="my-1 border-t border-light-outline-variant" role="separator" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowCreateFolder(true);
                    setMenuOpen(false);
                  }}
                  className="menu-item py-2.5"
                >
                  <FolderIcon className="h-[18px] w-[18px] text-light-on-surface-variant" />
                  Criar pasta
                </button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-label="Carregar arquivos"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) handleFilesSelected(e.target.files);
                e.target.value = "";
                onClose();
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              multiple
              aria-label="Carregar pasta"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) handleFolderSelected(e.target.files);
                e.target.value = "";
                onClose();
              }}
            />
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-gutter-sm overflow-y-auto px-4 pb-4">
          <NavGroup>
            {!isGuest && (
              <>
                <NavRow icon={HomeIcon} active={view.kind === "home"} onClick={go(onSelectHome)}>
                  Página inicial
                </NavRow>
                <NavRow icon={FolderIcon} active={isMyDrive} onClick={go(() => onNavigateFolder([]))}>
                  Meus arquivos
                </NavRow>
              </>
            )}
            <NavRow icon={ShareIcon} active={view.kind === "shared"} onClick={go(onSelectShared)}>
              Compartilhado comigo
            </NavRow>
            {!isGuest && (
              <>
                <NavRow icon={StarIcon} active={view.kind === "favorites"} onClick={go(onSelectFavorites)}>
                  Favoritos
                </NavRow>
                <NavRow icon={TrashIcon} active={view.kind === "trash"} onClick={go(onSelectTrash)}>
                  Lixeira
                </NavRow>
              </>
            )}
          </NavGroup>

          {canManageMembers && (
            <NavGroup label="Administração">
              <NavRow icon={RepositoryIcon} active={view.kind === "repositories"} onClick={go(onSelectRepositories)}>
                Repositórios
              </NavRow>
              <NavRow icon={UsersIcon} active={view.kind === "members"} onClick={go(onSelectMembers)}>
                Membros
              </NavRow>
              <NavRow icon={EventLogIcon} active={view.kind === "eventLog"} onClick={go(onSelectEventLog)}>
                Log de eventos
              </NavRow>
            </NavGroup>
          )}
        </nav>

        <StorageUsageIndicator userId={!isGuest ? userId : undefined} repositoryId={activeRepositoryId} />

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
      </aside>
    </>
  );
}
