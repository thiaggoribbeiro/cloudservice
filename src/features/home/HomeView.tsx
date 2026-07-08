import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { EmptyState } from "../../components/ui/EmptyState";
import { PreviewModal } from "../files/PreviewModal";
import { downloadFile } from "../files/fileApi";
import { listRecentFiles } from "./homeApi";
import {
  formatBytes,
  formatRelativeTime,
  isPreviewable,
  fileKindOf,
  FILE_KIND_LABEL,
  type FileKindFilter,
} from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import type { FileRow } from "../../types/domain";

const FILTER_TABS: FileKindFilter[] = ["all", "image", "document", "spreadsheet", "pdf"];

export function HomeView({ ownerId }: { ownerId: string }) {
  const [preview, setPreview] = useState<FileRow | null>(null);
  const [kindFilter, setKindFilter] = useState<FileKindFilter>("all");
  const [nameFilter, setNameFilter] = useState("");

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["recentFiles", ownerId],
    queryFn: () => listRecentFiles(ownerId),
  });

  function openFile(file: FileRow) {
    if (isPreviewable(file.mime_type)) setPreview(file);
    else downloadFile(file);
  }

  const shelfFiles = files.slice(0, 3);

  const filteredFiles = useMemo(() => {
    const query = nameFilter.trim().toLowerCase();
    return files.filter((file) => {
      if (kindFilter !== "all" && fileKindOf(file.mime_type) !== kindFilter) return false;
      if (query && !file.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [files, kindFilter, nameFilter]);

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
          <>
            <section>
              <h2 className="mb-3 text-lg font-bold text-brand-black dark:text-white">Para você</h2>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {shelfFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white p-4 transition-colors duration-150 hover:border-brand-secondary dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-14 w-14 shrink-0 rounded-xl" />
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-brand-black dark:text-white">{file.name}</span>
                        <span className="mono-tag text-[11px] text-brand-gray">
                          {formatBytes(file.size_bytes)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-brand-gray">
                      Você abriu · {formatRelativeTime(file.last_accessed_at)}
                    </p>
                    <button
                      type="button"
                      onClick={() => openFile(file)}
                      className="btn-ghost mt-auto text-sm"
                    >
                      Abrir
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-9">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-brand-black dark:text-white">Recente</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-1 rounded-full border border-brand-border p-1 dark:border-white/15">
                    {FILTER_TABS.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setKindFilter(tab)}
                        className={`eyebrow rounded-full px-3 py-1.5 transition-colors ${
                          kindFilter === tab
                            ? "bg-brand-primary text-white"
                            : "text-brand-gray hover:text-brand-black dark:hover:text-white"
                        }`}
                      >
                        {FILE_KIND_LABEL[tab]}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    placeholder="Filtrar por nome…"
                    className="field-input w-56"
                  />
                </div>
              </div>

              {filteredFiles.length === 0 ? (
                <p className="text-sm text-brand-gray">Nenhum arquivo encontrado.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-4 pb-2">
                    <span className="eyebrow flex-1 text-brand-gray">Nome</span>
                    <span className="eyebrow hidden w-28 shrink-0 text-right text-brand-gray sm:block">
                      Aberto
                    </span>
                    <span className="eyebrow hidden w-20 shrink-0 text-right text-brand-gray sm:block">
                      Tamanho
                    </span>
                  </div>
                  <div className="file-list">
                    {filteredFiles.map((file) => (
                      <div key={file.id} className="file-row" onDoubleClick={() => openFile(file)}>
                        <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-9 w-9 shrink-0 rounded-lg" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-black dark:text-white">
                          {file.name}
                        </span>
                        <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                          {formatRelativeTime(file.last_accessed_at)}
                        </span>
                        <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                          {formatBytes(file.size_bytes)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
