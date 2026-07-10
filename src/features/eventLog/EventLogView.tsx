import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { EmptyState } from "../../components/ui/EmptyState";
import { EVENT_LOG_PAGE_SIZE, listEventLogs } from "./eventLogApi";
import { EVENT_ACTION_LABEL, EVENT_CATEGORY_LABEL, type EventTargetType } from "../../lib/eventLogLabels";
import { ROLE_LABEL } from "../../lib/roleLabels";
import { formatRelativeTime } from "../../lib/format";
import { getFolderPath } from "../folders/folderApi";
import { LocateIcon } from "../../components/ui/icons";
import type { EventLog, Folder } from "../../types/domain";

const CATEGORY_FILTERS: (EventTargetType | "all")[] = [
  "all",
  "sessao",
  "pasta",
  "arquivo",
  "favorito",
  "compartilhamento",
  "membro",
  "repositorio",
];

// Metadata shape stamped on "upload_arquivo" events at upload time - see
// uploadFile in fileApi.ts. Older rows logged before this existed simply
// won't have it, which the render side treats as "no location to show".
type UploadMetadata = { folder_id: string | null; folder_path: string };

function isUploadMetadata(metadata: unknown): metadata is UploadMetadata {
  return !!metadata && typeof metadata === "object" && "folder_path" in metadata;
}

function UploadLocation({
  metadata,
  onNavigateFolder,
}: {
  metadata: UploadMetadata;
  onNavigateFolder: (path: Folder[]) => void;
}) {
  const [state, setState] = useState<"idle" | "locating" | "not-found">("idle");

  async function handleLocate() {
    if (metadata.folder_id === null) {
      onNavigateFolder([]);
      return;
    }
    setState("locating");
    const path = await getFolderPath(metadata.folder_id);
    if (path.length === 0) {
      setState("not-found");
      return;
    }
    setState("idle");
    onNavigateFolder(path);
  }

  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="truncate text-xs text-brand-gray">{metadata.folder_path}</span>
      {state === "not-found" ? (
        <span className="text-xs text-brand-gray">Pasta nao encontrada - pode ter sido excluida</span>
      ) : (
        <button
          type="button"
          onClick={handleLocate}
          disabled={state === "locating"}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-primary transition-colors hover:underline disabled:opacity-60"
        >
          <LocateIcon className="h-3.5 w-3.5" />
          {state === "locating" ? "Abrindo…" : "Ver local do arquivo"}
        </button>
      )}
    </span>
  );
}

export function EventLogView({ onNavigateFolder }: { onNavigateFolder: (path: Folder[]) => void }) {
  const [category, setCategory] = useState<EventTargetType | "all">("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<EventLog[]>([]);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["eventLogs", category, search, offset],
    queryFn: () =>
      listEventLogs({
        offset,
        actionCategory: category === "all" ? undefined : category,
        search: search.trim() || undefined,
      }),
  });

  function applyFilters(next: Partial<{ category: EventTargetType | "all"; search: string }>) {
    setOffset(0);
    setRows([]);
    if (next.category !== undefined) setCategory(next.category);
    if (next.search !== undefined) setSearch(next.search);
  }

  // React Query's cache keeps `data` scoped to the current offset, so once the
  // user pages past the first batch we accumulate results locally instead of
  // showing only the latest page.
  const visibleRows = offset === 0 ? data?.rows ?? [] : [...rows, ...(data?.rows ?? [])];

  function loadMore() {
    setRows(visibleRows);
    setOffset((o) => o + EVENT_LOG_PAGE_SIZE);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Log de Eventos" />

      <div className="flex flex-wrap items-center gap-3 border-b border-brand-border px-6 py-3 dark:border-white/10">
        <select
          aria-label="Filtrar por categoria"
          value={category}
          onChange={(e) => applyFilters({ category: e.target.value as EventTargetType | "all" })}
          className="field-input w-auto py-1.5 text-sm"
        >
          <option value="all">Todas as categorias</option>
          {CATEGORY_FILTERS.filter((c) => c !== "all").map((c) => (
            <option key={c} value={c}>
              {EVENT_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={search}
          onChange={(e) => applyFilters({ search: e.target.value })}
          placeholder="Buscar por e-mail…"
          className="field-input w-auto min-w-[220px] py-1.5 text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && offset === 0 ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title="Nenhum evento registrado"
            description="As acoes de gestores, usuarios e convidados aparecerao aqui."
          />
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 pb-2">
              <span className="eyebrow w-56 shrink-0 text-brand-gray">Usuario</span>
              <span className="eyebrow flex-1 text-brand-gray">Acao</span>
              <span className="eyebrow hidden w-40 shrink-0 text-right text-brand-gray sm:block">Quando</span>
            </div>
            <div className="file-list">
              {visibleRows.map((row) => (
                <div key={row.id} className="file-row">
                  <div className="flex w-56 shrink-0 flex-col">
                    <span className="truncate text-sm font-medium text-brand-black dark:text-white">
                      {row.user_email}
                    </span>
                    <span className="eyebrow text-[11px] text-brand-primary">{ROLE_LABEL[row.user_role]}</span>
                  </div>
                  <span className="flex min-w-0 flex-1 flex-col justify-center">
                    <span className="truncate text-sm text-brand-black dark:text-white">
                      {EVENT_ACTION_LABEL[row.action] ?? row.action}
                      {row.target_name && <span className="text-brand-gray"> "{row.target_name}"</span>}
                    </span>
                    {row.action === "upload_arquivo" && isUploadMetadata(row.metadata) && (
                      <UploadLocation metadata={row.metadata} onNavigateFolder={onNavigateFolder} />
                    )}
                  </span>
                  <span className="mono-tag hidden w-40 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                    {formatRelativeTime(row.created_at)}
                  </span>
                </div>
              ))}
            </div>

            {data?.hasMore && (
              <div className="flex justify-center pt-4">
                <button type="button" onClick={loadMore} disabled={isFetching} className="btn-ghost px-4 py-2 text-sm">
                  {isFetching ? "Carregando…" : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
