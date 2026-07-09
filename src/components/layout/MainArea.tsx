import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "./Topbar";
import { FileGrid } from "../../features/files/FileGrid";
import { UploadDropzone } from "../../features/files/UploadDropzone";
import { CreateFolderDialog } from "../../features/folders/CreateFolderDialog";
import { useFolderContents } from "../../features/folders/useFolderContents";
import { uploadFile } from "../../features/files/fileApi";
import { PlusIcon } from "../ui/icons";
import type { Folder, UserRole } from "../../types/domain";

export function MainArea({
  path,
  ownerId,
  userRole,
  restrictRootToOwner,
  rootLabel,
  onNavigate,
}: {
  path: Folder[];
  ownerId: string;
  userRole: UserRole;
  restrictRootToOwner?: boolean;
  rootLabel?: string;
  onNavigate: (path: Folder[]) => void;
}) {
  const currentFolderId = path.length ? path[path.length - 1].id : null;
  const currentRepositoryId = path.length ? path[path.length - 1].repository_id : null;
  const { folders, files, isLoading } = useFolderContents(
    currentFolderId,
    restrictRootToOwner ? ownerId : undefined,
  );
  const queryClient = useQueryClient();
  const [showCreateFolder, setShowCreateFolder] = useState(false);

  async function handleUpload(fileList: FileList) {
    for (const file of Array.from(fileList)) {
      await uploadFile(file, currentFolderId, ownerId);
    }
    queryClient.invalidateQueries({ queryKey: ["files", currentFolderId] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
  }

  // The sidebar's global "Criar pasta" only ever targets the personal drive
  // (its uploadTargetFolderId is null outside "Meus arquivos"), so browsing
  // into a shared folder or repositorio via this component is otherwise a
  // dead end for creating folders - this button is the only way in.
  const showNewFolderButton = !restrictRootToOwner && currentFolderId !== null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={path} onNavigate={onNavigate} rootLabel={rootLabel} />

      {showNewFolderButton && (
        <div className="flex justify-end border-b border-brand-border px-6 py-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowCreateFolder(true)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <PlusIcon className="h-4 w-4" />
            Nova pasta
          </button>
        </div>
      )}

      <UploadDropzone onUpload={handleUpload}>
        <div className="p-6">
          {isLoading ? (
            <p className="eyebrow text-brand-gray">Carregando…</p>
          ) : (
            <FileGrid
              folders={folders}
              files={files}
              currentFolderId={currentFolderId}
              currentUserId={ownerId}
              userRole={userRole}
              onOpenFolder={(folder) => onNavigate([...path, folder])}
            />
          )}
        </div>
      </UploadDropzone>

      {showCreateFolder && currentFolderId !== null && (
        <CreateFolderDialog
          title="Nova pasta"
          parentId={currentFolderId}
          ownerId={ownerId}
          allowLock={!!currentRepositoryId && (userRole === "admin" || userRole === "manager")}
          invalidateKeys={[["folderChildren", currentFolderId]]}
          onCreated={() => setShowCreateFolder(false)}
          onClose={() => setShowCreateFolder(false)}
        />
      )}
    </div>
  );
}
