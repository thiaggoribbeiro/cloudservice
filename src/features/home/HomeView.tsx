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
import { SearchIcon } from "../../components/ui/icons";
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
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1440px]">
          <Topbar
            path={[]}
            onNavigate={() => {}}
            title="Página inicial"
            subtitle="Seus arquivos mais recentes, do último aberto ao mais antigo."
          />
          <div className="px-4 pb-6 sm:px-6">
            {isLoading ? (
              <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>
            ) : files.length === 0 ? (
              <EmptyState
                title="Nada por aqui ainda"
                description="Os arquivos que você enviar ou abrir aparecem aqui, do mais recente ao mais antigo."
              />
            ) : (
              <div className="flex flex-col gap-gutter-lg">
                <section aria-labelledby="home-for-you">
                  <h2 id="home-for-you" className="section-title mb-3">
                    Para você
                  </h2>
                  <div className="grid grid-cols-1 gap-gutter-md sm:grid-cols-2 lg:grid-cols-3">
                    {shelfFiles.map((file, index) => (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => openFile(file)}
                        className="card card-interactive animate-rise flex flex-col gap-3 p-5 text-left hover:-translate-y-0.5"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <div className="flex items-center gap-3">
                          <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-12 w-12 shrink-0" />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate font-label text-label-lg text-light-on-surface">{file.name}</span>
                            <span className="mono-tag text-[12px] text-light-on-surface-variant">
                              {formatBytes(file.size_bytes)}
                            </span>
                          </div>
                        </div>
                        <p className="font-body text-body-sm text-light-on-surface-variant">
                          Você abriu {formatRelativeTime(file.last_accessed_at)}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>

                <section aria-labelledby="home-recent">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="home-recent" className="section-title">
                      Recentes
                    </h2>
                    <div className="flex flex-wrap items-center gap-gutter-sm">
                      <div className="flex flex-wrap gap-gutter-xs" role="group" aria-label="Filtrar por tipo">
                        {FILTER_TABS.map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setKindFilter(tab)}
                            aria-pressed={kindFilter === tab}
                            className={`chip ${kindFilter === tab ? "chip-active" : ""}`}
                          >
                            {FILE_KIND_LABEL[tab]}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full sm:w-56">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-light-outline" />
                        <input
                          type="search"
                          value={nameFilter}
                          onChange={(e) => setNameFilter(e.target.value)}
                          placeholder="Filtrar por nome…"
                          aria-label="Filtrar por nome"
                          className="field-input pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  {filteredFiles.length === 0 ? (
                    <EmptyState
                      title="Nenhum arquivo encontrado"
                      description="Tente outro tipo ou outro nome no filtro."
                    />
                  ) : (
                    <>
                      <div className="file-list-head">
                        <span className="flex-1">Nome</span>
                        <span className="hidden w-28 shrink-0 text-right sm:block">Aberto</span>
                        <span className="hidden w-20 shrink-0 text-right sm:block">Tamanho</span>
                      </div>
                      <div className="file-list">
                        {filteredFiles.map((file) => (
                          <div
                            key={file.id}
                            className="file-row"
                            onClick={isPreviewable(file.mime_type) ? () => openFile(file) : undefined}
                            onDoubleClick={isPreviewable(file.mime_type) ? undefined : () => openFile(file)}
                          >
                            <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-9 w-9 shrink-0" />
                            <span className="min-w-0 flex-1 truncate font-body text-body-md text-light-on-surface">
                              {file.name}
                            </span>
                            <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                              {formatRelativeTime(file.last_accessed_at)}
                            </span>
                            <span className="mono-tag hidden w-20 shrink-0 text-right text-[12px] text-light-on-surface-variant sm:block">
                              {formatBytes(file.size_bytes)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
