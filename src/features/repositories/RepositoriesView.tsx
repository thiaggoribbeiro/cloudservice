import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ShareDialog } from "../sharing/ShareDialog";
import { RenameDialog } from "../folders/RenameDialog";
import { CreateRepositoryDialog } from "./CreateRepositoryDialog";
import {
  listRepositories,
  getRepositoryUsage,
  updateRepositoryQuota,
  renameRepository,
  deleteRepository,
  REPOSITORY_QUOTA_MIN_BYTES,
  REPOSITORY_QUOTA_MAX_BYTES,
  type RepositoryWithRoot,
} from "./repositoryApi";
import { formatBytes } from "../../lib/format";
import { RepositoryIcon, MoreIcon, PlusIcon } from "../../components/ui/icons";
import type { CreateActionTarget, Folder, UserRole } from "../../types/domain";

const GIB = 1073741824;
type AccessibleRepository = RepositoryWithRoot & { root_folder: Folder };
type RepositoryDialog =
  | { kind: "rename"; repository: AccessibleRepository }
  | { kind: "delete"; repository: AccessibleRepository };

function RepositoryRow({
  repository,
  menuOpen,
  onToggleMenu,
  onOpen,
  onInvite,
  onRename,
  onDelete,
}: {
  repository: RepositoryWithRoot;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onInvite: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [quotaInput, setQuotaInput] = useState((repository.quota_bytes / GIB).toString());
  const hasRootFolder = !!repository.root_folder;

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
    <div className="card flex min-w-0 flex-col gap-3 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 items-center gap-2.5 text-left hover:text-light-primary"
        >
          <RepositoryIcon className="h-5 w-5 shrink-0 text-light-primary" />
          <span className="truncate font-label text-label-lg text-light-on-surface">
            {repository.name}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-1.5 sm:shrink-0">
          <button
            type="button"
            onClick={onInvite}
            disabled={!hasRootFolder}
            className="btn-ghost shrink-0 px-3 py-1.5"
            title={hasRootFolder ? undefined : "Pasta raiz indisponivel"}
          >
            Convidar
          </button>

          <div className="relative">
            <button
              type="button"
              data-item-menu-trigger
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu();
              }}
              disabled={!hasRootFolder}
              className="btn-icon h-8 w-8 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Mais opcoes do repositorio"
              title="Mais opcoes"
            >
              <MoreIcon className="h-5 w-5" />
            </button>

            {menuOpen && (
              <div
                data-item-menu
                className="menu-surface absolute right-0 top-full z-20 mt-1 w-48"
              >
                <button
                  type="button"
                  onClick={onRename}
                  className="menu-item"
                >
                  Renomear
                </button>
                <div className="my-1 border-t border-light-outline-variant" role="separator" />
                <button
                  type="button"
                  onClick={onDelete}
                  className="menu-item menu-item-danger"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-light-surface-container-high">
          <div
            className="h-full rounded-full bg-light-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {usage && (
          <p className="mt-1.5 font-body text-body-sm tabular-nums text-light-on-surface-variant">
            {formatBytes(usage.used_bytes)} / {formatBytes(usage.quota_bytes)}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`quota-${repository.id}`} className="font-label text-label-md text-light-on-surface-variant">
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
          className="field-input w-24 py-1.5"
        />
        {quotaChanged && (
          <button
            type="button"
            onClick={saveQuota}
            disabled={quotaMutation.isPending}
            className="btn-primary px-3 py-1.5"
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [repositoryDialog, setRepositoryDialog] = useState<RepositoryDialog | null>(null);
  const queryClient = useQueryClient();

  const { data: repositories = [], isLoading } = useQuery({
    queryKey: ["repositories"],
    queryFn: listRepositories,
  });

  useEffect(() => {
    if (!openMenuId) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("[data-item-menu]") || target.closest("[data-item-menu-trigger]")) return;
      setOpenMenuId(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openMenuId]);

  function invalidateRepositoryViews(repositoryId?: string) {
    queryClient.invalidateQueries({ queryKey: ["repositories"] });
    queryClient.invalidateQueries({ queryKey: ["folderChildren"] });
    queryClient.invalidateQueries({ queryKey: ["files"] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
    queryClient.invalidateQueries({ queryKey: ["repositoryUsage"] });
    if (repositoryId) queryClient.invalidateQueries({ queryKey: ["repositoryUsage", repositoryId] });
  }

  const deleteRepositoryMutation = useMutation({
    mutationFn: deleteRepository,
    onSuccess: (_, repository) => invalidateRepositoryViews(repository.id),
  });

  function publishActionTarget(folder: Folder | null) {
    onActionTargetChange?.(
      folder
        ? {
            folderId: folder.id,
            repositoryId: folder.repository_id,
            allowLock: !!folder.repository_id && (userRole === "admin" || userRole === "manager"),
          }
        : null,
    );
  }

  function requireRoot(repository: RepositoryWithRoot, action: (repository: AccessibleRepository) => void) {
    if (!repository.root_folder) {
      setSelectedRepo(null);
      setSubPath([]);
      publishActionTarget(null);
      setOpenError("Nao foi possivel abrir a pasta raiz deste repositorio. Verifique as permissoes do repositorio.");
      return;
    }

    setOpenError(null);
    action(repository as AccessibleRepository);
  }

  function openRepository(repository: RepositoryWithRoot) {
    requireRoot(repository, (accessibleRepository) => {
      setSelectedRepo(accessibleRepository);
      setSubPath([]);
      publishActionTarget(accessibleRepository.root_folder);
    });
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
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Topbar
        path={[]}
        onNavigate={() => {}}
        title="Repositórios"
        subtitle={`${repositories.length} ${repositories.length === 1 ? "repositório" : "repositórios"}`}
        actions={
          <button type="button" onClick={() => setShowCreate(true)} className="btn-primary">
            <PlusIcon className="h-[18px] w-[18px]" />
            Novo repositório
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {openError && (
          <div role="alert" className="mb-4 rounded-xl bg-light-error-container px-4 py-3 font-body text-body-sm text-light-on-error-container">
            {openError}
          </div>
        )}
        {isLoading ? (
          <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>
        ) : repositories.length === 0 ? (
          <EmptyState
            title="Nenhum repositório ainda"
            description="Crie um repositório para compartilhar um espaço com cota própria entre vários membros."
          />
        ) : (
          <div className="grid grid-cols-1 gap-gutter-md xl:grid-cols-2">
            {repositories.map((repository) => (
              <RepositoryRow
                key={repository.id}
                repository={repository}
                menuOpen={openMenuId === repository.id}
                onToggleMenu={() => setOpenMenuId((current) => (current === repository.id ? null : repository.id))}
                onOpen={() => openRepository(repository)}
                onInvite={() => requireRoot(repository, (repo) => setInviteTarget(repo.root_folder))}
                onRename={() => {
                  setOpenMenuId(null);
                  requireRoot(repository, (repo) => setRepositoryDialog({ kind: "rename", repository: repo }));
                }}
                onDelete={() => {
                  setOpenMenuId(null);
                  requireRoot(repository, (repo) => setRepositoryDialog({ kind: "delete", repository: repo }));
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
        <ShareDialog folder={inviteTarget} currentUserId={userId} onClose={() => setInviteTarget(null)} />
      )}

      {repositoryDialog?.kind === "rename" && (
        <RenameDialog
          title="Renomear repositorio"
          currentName={repositoryDialog.repository.name}
          invalidateKeys={[["repositories"], ["repositoryUsage", repositoryDialog.repository.id]]}
          onRename={(name) =>
            renameRepository(repositoryDialog.repository.id, repositoryDialog.repository.root_folder.id, name)
          }
          onClose={() => setRepositoryDialog(null)}
        />
      )}

      {repositoryDialog?.kind === "delete" && (
        <ConfirmDialog
          title="Excluir repositório"
          message={`O repositorio "${repositoryDialog.repository.name}" e todo o seu conteudo serao movidos para a lixeira.`}
          confirmLabel={deleteRepositoryMutation.isPending ? "Excluindo..." : "Excluir"}
          onConfirm={() => deleteRepositoryMutation.mutate(repositoryDialog.repository)}
          onClose={() => setRepositoryDialog(null)}
        />
      )}
    </div>
  );
}
