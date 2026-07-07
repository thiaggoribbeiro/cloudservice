import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FolderTree } from "../../features/folders/FolderTree";
import { StorageUsageIndicator } from "../../features/storageUsage/StorageUsageIndicator";
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
} from "../ui/icons";
import type { Folder, UserRole, ViewSelection } from "../../types/domain";

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
          ? "bg-white font-semibold text-brand-primary shadow-sm"
          : "text-brand-black/70 hover:bg-white/60 hover:text-brand-black"
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
  onNavigateFolder,
  onSelectHome,
  onSelectShared,
  onSelectFavorites,
  onSelectTrash,
  onSelectMembers,
}: {
  view: ViewSelection;
  path: Folder[];
  userId: string;
  role: UserRole;
  onNavigateFolder: (path: Folder[]) => void;
  onSelectHome: () => void;
  onSelectShared: () => void;
  onSelectFavorites: () => void;
  onSelectTrash: () => void;
  onSelectMembers: () => void;
}) {
  const currentFolderId = path.length ? path[path.length - 1].id : null;
  const isMyDrive = view.kind === "folder";
  const uploadTargetFolderId = isMyDrive ? currentFolderId : null;
  const isGuest = role === "guest";
  const canManageMembers = role === "admin" || role === "manager";

  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-brand-border pt-4">
      {!isGuest && (
        <div className="relative px-3 pb-4">
          <button
            type="button"
            data-item-menu-trigger
            onClick={() => setMenuOpen((o) => !o)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary shadow-sm transition-transform hover:-translate-y-px hover:shadow-md"
          >
            <PlusIcon className="h-4 w-4" />
            Criar ou carregar
          </button>

          {menuOpen && (
            <div
              data-item-menu
              className="stagger-0 absolute left-3 right-3 top-full z-20 mt-1.5 overflow-hidden rounded-lg border border-brand-border bg-white py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.5)]"
            >
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
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
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50"
              >
                <UploadFolderIcon className="h-[18px] w-[18px] text-brand-gray" />
                Carregamento de pasta
              </button>
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
                active={isMyDrive && currentFolderId === null}
                onClick={() => onNavigateFolder([])}
              >
                Meus arquivos
              </NavRow>
              <div className="mt-0.5 pl-[26px]">
                <FolderTree
                  ownerId={userId}
                  currentFolderId={isMyDrive ? currentFolderId : null}
                  onNavigate={onNavigateFolder}
                />
              </div>
            </div>
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
    </aside>
  );
}
