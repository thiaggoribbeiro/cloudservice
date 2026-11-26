import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { PreviewModal } from "../files/PreviewModal";
import { downloadFile } from "../files/fileApi";
import { StarIcon, FolderTileIcon } from "../../components/ui/icons";
import { listFavorites, removeFavoriteFile, removeFavoriteFolder } from "./favoritesApi";
import { formatBytes, formatRelativeTime, isPreviewable } from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import type { Folder, FileRow, UserRole } from "../../types/domain";

export function FavoritesView({ userId, userRole }: { userId: string; userRole: UserRole }) {
  const [selectedRoot, setSelectedRoot] = useState<Folder | null>(null);
  const [subPath, setSubPath] = useState<Folder[]>([]);
  const [preview, setPreview] = useState<FileRow | null>(null);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["favorites", userId],
    queryFn: () => listFavorites(userId),
  });

  const removeFileMutation = useMutation({
    mutationFn: (fileId: string) => removeFavoriteFile(userId, fileId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", userId] }),
  });
  const removeFolderMutation = useMutation({
    mutationFn: (folderId: string) => removeFavoriteFolder(userId, folderId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", userId] }),
  });

  if (selectedRoot) {
    return (
      <MainArea
        path={[selectedRoot, ...subPath]}
        ownerId={userId}
        userRole={userRole}
        rootLabel="Favoritos"
        onNavigate={(newPath) => {
          if (newPath.length === 0) {
            setSelectedRoot(null);
            setSubPath([]);
            return;
          }
          setSelectedRoot(newPath[0]);
          setSubPath(newPath.slice(1));
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Favoritos" />
      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {isLoading ? (
          <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="Nenhum favorito ainda"
            description="Marque arquivos ou pastas como favoritos para encontra-los rapido aqui."
          />
        ) : (
          <>
            <div className="file-list-head">
              <span className="flex-1">Nome</span>
              <span className="hidden w-28 shrink-0 text-right sm:block">
                Modificado
              </span>
              <span className="hidden w-20 shrink-0 text-right sm:block">
                Tamanho
              </span>
              <span className="w-7 shrink-0" />
            </div>
            <div className="file-list">
              {entries.map((entry) =>
                entry.kind === "folder" ? (
                  <div
                    key={entry.favoriteId}
                    className="file-row group"
                    onClick={() => setSelectedRoot(entry.folder)}
                  >
                    <FolderTileIcon className="h-9 w-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-body text-body-md text-light-on-surface">
                      {entry.folder.name}
                    </span>
                    <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                      {formatRelativeTime(entry.folder.updated_at)}
                    </span>
                    <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                      —
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFolderMutation.mutate(entry.folder.id);
                      }}
                      className="btn-icon h-8 w-8 text-light-primary opacity-0 hover:text-light-primary focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label="Remover dos favoritos"
                    >
                      <StarIcon className="h-4 w-4" filled />
                    </button>
                  </div>
                ) : (
                  <div
                    key={entry.favoriteId}
                    className="file-row group"
                    onDoubleClick={() =>
                      isPreviewable(entry.file.mime_type) ? setPreview(entry.file) : downloadFile(entry.file)
                    }
                  >
                    <FileTypeIcon name={entry.file.name} mimeType={entry.file.mime_type} className="h-9 w-9 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-body text-body-md text-light-on-surface">
                      {entry.file.name}
                    </span>
                    <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                      {formatRelativeTime(entry.file.updated_at)}
                    </span>
                    <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                      {formatBytes(entry.file.size_bytes)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFileMutation.mutate(entry.file.id);
                      }}
                      className="btn-icon h-8 w-8 text-light-primary opacity-0 hover:text-light-primary focus-visible:opacity-100 group-hover:opacity-100"
                      aria-label="Remover dos favoritos"
                    >
                      <StarIcon className="h-4 w-4" filled />
                    </button>
                  </div>
                ),
              )}
            </div>
          </>
        )}
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
