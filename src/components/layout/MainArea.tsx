import { useQueryClient } from "@tanstack/react-query";
import { Topbar } from "./Topbar";
import { FileGrid } from "../../features/files/FileGrid";
import { UploadDropzone } from "../../features/files/UploadDropzone";
import { useFolderContents } from "../../features/folders/useFolderContents";
import { uploadFile } from "../../features/files/fileApi";
import { ViewModeSwitcher } from "../../features/files/ViewModeSwitcher";
import { useViewMode } from "../../features/files/viewMode";
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
  const { folders, files, isLoading } = useFolderContents(
    currentFolderId,
    restrictRootToOwner ? ownerId : undefined,
  );
  const queryClient = useQueryClient();
  const { viewMode } = useViewMode();

  async function handleUpload(fileList: FileList) {
    for (const file of Array.from(fileList)) {
      await uploadFile(file, currentFolderId, ownerId);
    }
    queryClient.invalidateQueries({ queryKey: ["files", currentFolderId] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
    queryClient.invalidateQueries({ queryKey: ["repositoryUsage"] });
    queryClient.invalidateQueries({ queryKey: ["folderLastModified"] });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Topbar path={path} onNavigate={onNavigate} rootLabel={rootLabel} actions={<ViewModeSwitcher />} />

      <UploadDropzone onUpload={handleUpload}>
        <div className="px-4 pb-6 sm:px-6">
          {isLoading ? (
            <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>
          ) : (
            <FileGrid
              folders={folders}
              files={files}
              currentFolderId={currentFolderId}
              currentUserId={ownerId}
              userRole={userRole}
              viewMode={viewMode}
              onOpenFolder={(folder) => onNavigate([...path, folder])}
            />
          )}
        </div>
      </UploadDropzone>
    </div>
  );
}
