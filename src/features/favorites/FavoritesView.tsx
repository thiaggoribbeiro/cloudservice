import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { PreviewModal } from "../files/PreviewModal";
import { downloadFile } from "../files/fileApi";
import { StarIcon } from "../../components/ui/icons";
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
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="Nenhum favorito ainda"
            description="Marque arquivos ou pastas como favoritos para encontra-los rapido aqui."
          />
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 pb-2">
              <span className="eyebrow flex-1 text-brand-gray">Nome</span>
              <span className="eyebrow hidden w-28 shrink-0 text-right text-brand-gray sm:block">
                Modificado
              </span>
              <span className="eyebrow hidden w-20 shrink-0 text-right text-brand-gray sm:block">
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
                    onDoubleClick={() => setSelectedRoot(entry.folder)}
                  >
                    <span className="file-row-icon text-brand-primary">📁</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-black dark:text-white">
                      {entry.folder.name}
                    </span>
                    <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                      {formatRelativeTime(entry.folder.updated_at)}
                    </span>
                    <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                      —
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFolderMutation.mutate(entry.folder.id);
                      }}
                      className="shrink-0 rounded-md p-1 text-brand-primary opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100 dark:hover:bg-white/10"
                      aria-label="Remover dos favoritos"
                    >
                      <StarIcon className="h-4 w-4" fill="currentColor" />
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
                    <FileTypeIcon name={entry.file.name} mimeType={entry.file.mime_type} className="h-9 w-9 shrink-0 rounded-lg" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-black dark:text-white">
                      {entry.file.name}
                    </span>
                    <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                      {formatRelativeTime(entry.file.updated_at)}
                    </span>
                    <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                      {formatBytes(entry.file.size_bytes)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFileMutation.mutate(entry.file.id);
                      }}
                      className="shrink-0 rounded-md p-1 text-brand-primary opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100 dark:hover:bg-white/10"
                      aria-label="Remover dos favoritos"
                    >
                      <StarIcon className="h-4 w-4" fill="currentColor" />
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
