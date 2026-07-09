import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { ShareDialog } from "../sharing/ShareDialog";
import { CreateRepositoryDialog } from "./CreateRepositoryDialog";
import {
  listRepositories,
  getRepositoryUsage,
  updateRepositoryQuota,
  REPOSITORY_QUOTA_MIN_BYTES,
  REPOSITORY_QUOTA_MAX_BYTES,
  type RepositoryWithRoot,
} from "./repositoryApi";
import { formatBytes } from "../../lib/format";
import { RepositoryIcon } from "../../components/ui/icons";
import type { CreateActionTarget, Folder, UserRole } from "../../types/domain";

const GIB = 1073741824;
type AccessibleRepository = RepositoryWithRoot & { root_folder: Folder };

function RepositoryRow({
  repository,
  onOpen,
  onInvite,
}: {
  repository: RepositoryWithRoot;
  onOpen: () => void;
  onInvite: () => void;
}) {
  const queryClient = useQueryClient();
  const [quotaInput, setQuotaInput] = useState((repository.quota_bytes / GIB).toString());

  const { data: usage } = useQuery({
    queryKey: ["repositoryUsage", repository.id],
    queryFn: () => getRepositoryUsage(repository.id),
  });

  const quotaMutation = useMutation({
    mutationFn: (quotaBytes: number) => updateRepositoryQuota(repository.id, quotaBytes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["repositoryUsage", repository.id] });
    },
  });

  const percent = usage?.quota_bytes ? Math.min(100, (usage.used_bytes / usage.quota_bytes) * 100) : 0;
  const quotaChanged = Number(quotaInput) !== repository.quota_bytes / GIB;

  function saveQuota() {
    const gib = Number(quotaInput);
    if (Number.isNaN(gib)) return;
    const bytes = Math.round(gib * GIB);
    if (bytes < REPOSITORY_QUOTA_MIN_BYTES || bytes > REPOSITORY_QUOTA_MAX_BYTES) return;
    quotaMutation.mutate(bytes);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-border p-4 dark:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 items-center gap-2.5 text-left hover:text-brand-primary"
        >
          <RepositoryIcon className="h-5 w-5 shrink-0 text-brand-primary" />
          <span className="truncate text-sm font-semibold text-brand-black dark:text-white">
            {repository.name}
          </span>
        </button>
        <button
          type="button"
          onClick={onInvite}
          disabled={!repository.root_folder}
          className="btn-ghost shrink-0 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-45"
          title={repository.root_folder ? undefined : "Pasta raiz indisponivel"}
        >
          Convidar
        </button>
      </div>

      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
          <div
            className="h-full rounded-full bg-brand-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {usage && (
          <p className="mono-tag mt-1.5 text-[11px] text-brand-gray">
            {formatBytes(usage.used_bytes)} / {formatBytes(usage.quota_bytes)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={`quota-${repository.id}`} className="eyebrow text-brand-gray">
          Cota (GB)
        </label>
        <input
          id={`quota-${repository.id}`}
          type="number"
          min={REPOSITORY_QUOTA_MIN_BYTES / GIB}
          max={REPOSITORY_QUOTA_MAX_BYTES / GIB}
          step={0.5}
          value={quotaInput}
          onChange={(e) => setQuotaInput(e.target.value)}
          className="field-input w-24 py-1.5 text-sm"
        />
        {quotaChanged && (
          <button
            type="button"
            onClick={saveQuota}
            disabled={quotaMutation.isPending}
            className="btn-primary px-3 py-1.5 text-sm"
          >
            Salvar
          </button>
        )}
      </div>
    </div>
  );
}

export function RepositoriesView({
  userId,
  userRole,
  onActionTargetChange,
}: {
  userId: string;
  userRole: UserRole;
  onActionTargetChange?: (target: CreateActionTarget | null) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<Folder | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<AccessibleRepository | null>(null);
  const [subPath, setSubPath] = useState<Folder[]>([]);
  const [openError, setOpenError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: listRepositories,
  });

  function publishActionTarget(folder: Folder | null) {
    onActionTargetChange?.(
      folder
        ? {
            folderId: folder.id,
            allowLock: !!folder.repository_id && (userRole === "admin" || userRole === "manager"),
          }
        : null,
    );
  }

  function openRepository(repository: RepositoryWithRoot) {
    if (!repository.root_folder) {
      setSelectedRepo(null);
      setSubPath([]);
      publishActionTarget(null);
      setOpenError("Nao foi possivel abrir a pasta raiz deste repositorio. Verifique as permissoes do repositorio.");
      return;
    }

    setOpenError(null);
    setSelectedRepo(repository as AccessibleRepository);
    setSubPath([]);
    publishActionTarget(repository.root_folder);
  }

  if (selectedRepo) {
    return (
      <MainArea
        path={[selectedRepo.root_folder, ...subPath]}
        ownerId={userId}
        userRole={userRole}
        rootLabel="Repositórios"
        onNavigate={(newPath) => {
          if (newPath.length === 0) {
            setSelectedRepo(null);
            setSubPath([]);
            publishActionTarget(null);
            return;
          }
          setSubPath(newPath.slice(1));
          publishActionTarget(newPath[newPath.length - 1]);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Repositórios" />

      <div className="flex items-center justify-between border-b border-brand-border px-6 py-3 dark:border-white/10">
        <p className="mono-tag text-xs text-brand-gray">
          {repositories.length} {repositories.length === 1 ? "repositorio" : "repositorios"}
        </p>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + Novo repositorio
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {openError && (
          <div className="mb-4 rounded-lg border border-brand-primary/25 bg-brand-primary/10 px-4 py-3 text-sm text-brand-black dark:text-white">
            {openError}
          </div>
        )}
        {isLoading ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : repositories.length === 0 ? (
          <EmptyState
            title="Nenhum repositorio ainda"
            description="Crie um repositorio para compartilhar um espaco com cota propria entre varios membros."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {repositories.map((repository) => (
              <RepositoryRow
                key={repository.id}
                repository={repository}
                onOpen={() => openRepository(repository)}
                onInvite={() => {
                  if (repository.root_folder) setInviteTarget(repository.root_folder);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateRepositoryDialog
          onCreated={(rootFolder) => {
            queryClient.invalidateQueries({ queryKey: ["repositories"] });
            setShowCreate(false);
            setInviteTarget(rootFolder);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {inviteTarget && (
        <ShareDialog
          target={{ kind: "folder", folder: inviteTarget }}
          currentUserId={userId}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
}
