import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { PreviewModal } from "../files/PreviewModal";
import { downloadFile } from "../files/fileApi";
import { StarIcon } from "../../components/ui/icons";
import { listFavorites, removeFavoriteFile, removeFavoriteFolder } from "./favoritesApi";
import { fileIconFor, formatBytes, isPreviewable } from "../../lib/format";
import type { Folder, FileRow } from "../../types/domain";

export function FavoritesView({ userId }: { userId: string }) {
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
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {entries.map((entry) =>
              entry.kind === "folder" ? (
                <div
                  key={entry.favoriteId}
                  className="tile group"
                  onDoubleClick={() => setSelectedRoot(entry.folder)}
                >
                  <span className="tile-icon text-brand-primary">📁</span>
                  <span className="w-full truncate text-center text-sm font-medium text-brand-black">
                    {entry.folder.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFolderMutation.mutate(entry.folder.id);
                    }}
                    className="absolute right-1.5 top-1.5 rounded-md p-1 text-brand-primary opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100"
                    aria-label="Remover dos favoritos"
                  >
                    <StarIcon className="h-4 w-4" fill="currentColor" />
                  </button>
                </div>
              ) : (
                <div
                  key={entry.favoriteId}
                  className="tile group"
                  onDoubleClick={() =>
                    isPreviewable(entry.file.mime_type) ? setPreview(entry.file) : downloadFile(entry.file)
                  }
                >
                  <span className="tile-icon">{fileIconFor(entry.file.mime_type)}</span>
                  <span className="w-full truncate text-center text-sm font-medium text-brand-black">
                    {entry.file.name}
                  </span>
                  <span className="mono-tag text-[11px] text-brand-gray">
                    {formatBytes(entry.file.size_bytes)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFileMutation.mutate(entry.file.id);
                    }}
                    className="absolute right-1.5 top-1.5 rounded-md p-1 text-brand-primary opacity-0 transition-opacity hover:bg-brand-pale/60 group-hover:opacity-100"
                    aria-label="Remover dos favoritos"
                  >
                    <StarIcon className="h-4 w-4" fill="currentColor" />
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
