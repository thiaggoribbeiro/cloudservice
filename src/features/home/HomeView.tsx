import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { EmptyState } from "../../components/ui/EmptyState";
import { PreviewModal } from "../files/PreviewModal";
import { downloadFile } from "../files/fileApi";
import { listRecentFiles } from "./homeApi";
import { fileIconFor, formatBytes, isPreviewable } from "../../lib/format";
import type { FileRow } from "../../types/domain";

export function HomeView({ ownerId }: { ownerId: string }) {
  const [preview, setPreview] = useState<FileRow | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["recentFiles", ownerId],
    queryFn: () => listRecentFiles(ownerId),
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Pagina inicial" />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : files.length === 0 ? (
          <EmptyState
            title="Nada por aqui ainda"
            description="Arquivos que voce enviar ou abrir aparecem aqui, do mais recente ao mais antigo."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {files.map((file) => (
              <div
                key={file.id}
                className="tile"
                onDoubleClick={() =>
                  isPreviewable(file.mime_type) ? setPreview(file) : downloadFile(file)
                }
              >
                <span className="tile-icon">{fileIconFor(file.mime_type)}</span>
                <span className="w-full truncate text-center text-sm font-medium text-brand-black">
                  {file.name}
                </span>
                <span className="mono-tag text-[11px] text-brand-gray">
                  {formatBytes(file.size_bytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
