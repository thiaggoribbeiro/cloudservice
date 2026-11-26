import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { MoreIcon, PlusIcon } from "../../components/ui/icons";
import {
  listMembers,
  listOwnedFoldersForSharing,
  listAllFoldersForSharing,
  createMember,
  updateMember,
  resetMemberPassword,
  deleteMember,
  type CreateMemberResult,
  type ResetPasswordResult,
} from "./membersApi";
import type { Profile, UserRole } from "../../types/domain";
import { ROLE_LABEL } from "../../lib/roleLabels";
import { getInitials } from "../../lib/initials";

const AVESTAID_ENABLED = import.meta.env.VITE_AVESTAID_ENABLED === "true";
const AVESTAID_PORTAL_URL = import.meta.env.VITE_AVESTAID_PORTAL_URL as string;

const ASSIGNABLE_ROLES: Exclude<UserRole, "admin">[] = ["user", "guest", "manager"];

// Sentinel folder-select value meaning "create the guest without folder access
// now, share a folder with them separately afterwards" - distinct from the
// unselected placeholder, which still forces an explicit choice.
const NO_FOLDER = "__none__";

// Shared column template for the members table - the header and every row
// apply this exact same string, so their tracks can never drift out of
// alignment the way independently-sized flex columns did. fr units absorb
// all leftover width instead of stranding it on the right; columns reveal
// progressively at wider breakpoints, mirroring the file list's own pattern.
const MEMBER_ROW_GRID =
  "grid grid-cols-[1fr_2.5rem] items-center gap-3 sm:grid-cols-[1.6fr_1.4fr_2.5rem] lg:grid-cols-[1.6fr_1.4fr_0.7fr_2.5rem]";

export function MembersView({
  currentUserId,
  currentUserEmail,
  currentUserRole,
}: {
  currentUserId: string;
  currentUserEmail: string;
  currentUserRole: UserRole;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [passwordResult, setPasswordResult] = useState<CreateMemberResult | ResetPasswordResult | null>(
    null,
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
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

  function handleCreated(res: CreateMemberResult) {
    setShowCreate(false);
    setPasswordResult(res);
    queryClient.invalidateQueries({ queryKey: ["members"] });
  }

  function handleUpdated() {
    setEditTarget(null);
    queryClient.invalidateQueries({ queryKey: ["members"] });
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <Topbar
        path={[]}
        onNavigate={() => {}}
        title="Membros"
        subtitle={`${members.length} ${members.length === 1 ? "membro cadastrado" : "membros cadastrados"}`}
        actions={
        <button
          type="button"
          onClick={() => {
            // Under AvestaID, credential issuance and access grants live in
            // the central console — this app no longer creates members itself.
            if (AVESTAID_ENABLED) {
              window.open(`${AVESTAID_PORTAL_URL}/admin/membros?app=cloudservice`, "_blank");
              return;
            }
            setShowCreate(true);
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-[18px] w-[18px]" />
          Novo membro
        </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {isLoading ? (
          <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>
        ) : members.length === 0 ? (
          <EmptyState title="Nenhum membro ainda" description="Crie o primeiro membro da equipe." />
        ) : (
          <>
            <div className={`${MEMBER_ROW_GRID} px-3 pb-2 font-label text-label-md text-light-on-surface-variant sm:px-4`}>
              <span>Usuário</span>
              <span className="hidden sm:block">E-mail</span>
              <span className="hidden lg:block">Nível de acesso</span>
              <span className="text-center">Ações</span>
            </div>

            <div className="file-list">
              {members.map((member) => {
                const canManage = member.id !== currentUserId && member.role !== "admin";
                const name = member.display_name || member.email;

                return (
                  <div key={member.id} className={`file-row cursor-default ${MEMBER_ROW_GRID}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-light-surface-container font-label text-label-md text-light-primary">
                        {getInitials(member.display_name, member.email)}
                      </span>
                      <span className="truncate font-body text-body-md text-light-on-surface">
                        {name}
                      </span>
                    </span>

                    <span className="mono-tag hidden min-w-0 truncate text-[12px] text-light-on-surface-variant sm:block">
                      {member.email}
                    </span>
                    <span className="hidden min-w-0 lg:block">
                      <span className="badge badge-neutral">
                        {ROLE_LABEL[member.role]}
                      </span>
                    </span>

                    {canManage ? (
                      <div className="relative flex justify-center">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          data-item-menu-trigger
                          className="btn-icon h-8 w-8"
                          aria-label="Mais opcoes"
                        >
                          <MoreIcon className="h-5 w-5" />
                        </button>
                        {openMenuId === member.id && (
                          <div
                            data-item-menu
                            className="menu-surface absolute right-0 top-full z-10 mt-1 w-48"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget(member);
                                setOpenMenuId(null);
                              }}
                              className="menu-item"
                            >
                              Editar
                            </button>
                            {/* Excluir localmente duplicaria "Revogar acesso" do AvestaID, que já
                                remove o app_access sem apagar o histórico -- revogação passa a
                                acontecer só lá quando o AvestaID está ligado. */}
                            {!AVESTAID_ENABLED && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget(member);
                                  setOpenMenuId(null);
                                }}
                                className="menu-item menu-item-danger"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showCreate && (
        <CreateMemberDialog
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
          currentUserRole={currentUserRole}
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editTarget && (
        <EditMemberDialog
          member={editTarget}
          onUpdated={handleUpdated}
          onPasswordReset={(res) => {
            setEditTarget(null);
            setPasswordResult(res);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir membro"
          message={`"${deleteTarget.display_name || deleteTarget.email}" sera excluido permanentemente, junto com todos os arquivos e pastas que possui. Essa acao nao pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {passwordResult && (
        <TemporaryPasswordDialog result={passwordResult} onClose={() => setPasswordResult(null)} />
      )}
    </div>
  );
}

function CreateMemberDialog({
  currentUserId,
  currentUserEmail,
  currentUserRole,
  onCreated,
  onClose,
}: {
  currentUserId: string;
  currentUserEmail: string;
  currentUserRole: UserRole;
  onCreated: (result: CreateMemberResult) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>("user");
  const [folderId, setFolderId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["shareableFolders", currentUserRole, currentUserId],
    queryFn: () =>
      currentUserRole === "admin"
        ? listAllFoldersForSharing()
        : listOwnedFoldersForSharing(currentUserId, currentUserEmail),
    enabled: role === "guest",
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createMember({
        email: email.trim(),
        display_name: displayName.trim(),
        role,
        folder_id: role === "guest" && folderId !== NO_FOLDER ? folderId : undefined,
      }),
    onSuccess: onCreated,
    onError: (err: Error) => setError(err.message || "Nao foi possivel criar o membro."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!email.trim() || !displayName.trim()) {
      setError("Preencha e-mail e nome de exibicao.");
      return;
    }
    if (role === "guest" && !folderId) {
      setError("Selecione uma pasta ou \"Nenhuma\" para o convidado.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <Modal title="Novo membro" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-gutter-md sm:grid-cols-2">
        <div className="flex flex-col">
          <label className="field-label">Nome de exibicao</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="field-input"
            placeholder="Nome completo"
          />
        </div>

        <div className="flex flex-col">
          <label className="field-label">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
            placeholder="pessoa@empresa.com.br"
          />
        </div>

        <div className="flex flex-col">
          <label className="field-label">Acesso</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<UserRole, "admin">)}
            className="field-input"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        {role === "guest" && (
          <div className="flex flex-col sm:col-span-2">
            <label className="field-label">Pasta compartilhada</label>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="field-input">
              <option value="">Selecione uma pasta…</option>
              <option value={NO_FOLDER}>Nenhuma</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {currentUserRole === "admin" ? `${f.name} — ${f.owner_email}` : f.name}
                </option>
              ))}
            </select>
            {folders.length === 0 && (
              <p className="font-body text-body-sm text-light-on-surface-variant">
                {currentUserRole === "admin"
                  ? "Nenhuma pasta encontrada no sistema."
                  : "Voce ainda nao possui pastas para compartilhar."}
              </p>
            )}
          </div>
        )}

        {error && <p role="alert" className="font-body text-body-sm text-light-error sm:col-span-2">{error}</p>}

        <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full py-2.5 sm:col-span-2">
          {createMutation.isPending ? "Criando…" : "Criar membro"}
        </button>
      </form>
    </Modal>
  );
}

function EditMemberDialog({
  member,
  onUpdated,
  onPasswordReset,
  onClose,
}: {
  member: Profile;
  onUpdated: () => void;
  onPasswordReset: (result: ResetPasswordResult) => void;
  onClose: () => void;
}) {
  const [displayName, setDisplayName] = useState(member.display_name ?? "");
  const [role, setRole] = useState<Exclude<UserRole, "admin">>(member.role as Exclude<UserRole, "admin">);
  const [error, setError] = useState<string | null>(null);

  const updateMutation = useMutation({
    mutationFn: () => updateMember({ user_id: member.id, display_name: displayName.trim(), role }),
    onSuccess: onUpdated,
    onError: (err: Error) => setError(err.message || "Nao foi possivel salvar as alteracoes."),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetMemberPassword(member.id),
    onSuccess: onPasswordReset,
    onError: (err: Error) => setError(err.message || "Nao foi possivel resetar a senha."),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!displayName.trim()) {
      setError("Preencha o nome de exibicao.");
      return;
    }
    updateMutation.mutate();
  }

  return (
    <Modal title={`Editar "${member.display_name || member.email}"`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-gutter-md sm:grid-cols-2">
        <div className="flex flex-col">
          <label htmlFor="edit-display-name" className="field-label">
            Nome de exibicao
          </label>
          <input
            id="edit-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="field-input"
          />
        </div>

        <div className="flex flex-col">
          <label htmlFor="edit-role" className="field-label">
            Acesso
          </label>
          {AVESTAID_ENABLED ? (
            <>
              <input id="edit-role" value={ROLE_LABEL[role]} disabled className="field-input opacity-60" />
              <p className="field-hint">Nível de acesso é gerenciado pelo AvestaID.</p>
            </>
          ) : (
            <select
              id="edit-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Exclude<UserRole, "admin">)}
              className="field-input"
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p role="alert" className="font-body text-body-sm text-light-error sm:col-span-2">{error}</p>}

        <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full py-2.5 sm:col-span-2">
          {updateMutation.isPending ? "Salvando…" : "Salvar alteracoes"}
        </button>

        <div className="border-t border-light-outline-variant pt-4 sm:col-span-2">
          {AVESTAID_ENABLED ? (
            <button
              type="button"
              onClick={() => window.open(`${AVESTAID_PORTAL_URL}/admin/membros?app=cloudservice`, "_blank")}
              className="btn-ghost w-full py-2.5"
            >
              Redefinir senha no AvestaID
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  resetMutation.mutate();
                }}
                disabled={resetMutation.isPending}
                className="btn-ghost w-full py-2.5"
              >
                {resetMutation.isPending ? "Gerando senha…" : "Resetar senha"}
              </button>
              <p className="field-hint">
                Gera uma nova senha provisoria; o membro devera definir uma nova senha no proximo acesso.
              </p>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}

function TemporaryPasswordDialog({
  result,
  onClose,
}: {
  result: CreateMemberResult | ResetPasswordResult;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(result.temporary_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal title="Senha provisoria" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="font-body text-body-sm text-light-on-surface-variant">
          Repasse esta senha provisória para <span className="font-medium text-light-on-surface">{result.email}</span>.
          Ao entrar com ela, sera solicitada a criacao de uma nova senha.
        </p>

        <div className="flex flex-col gap-2 rounded-xl border border-light-outline-variant bg-light-surface-container-low px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="mono-tag break-all text-base text-light-on-surface">{result.temporary_password}</span>
          <button type="button" onClick={copy} className="btn-ghost shrink-0 px-3 py-1.5">
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <button type="button" onClick={onClose} className="btn-primary w-full py-2.5">
          Concluir
        </button>
      </div>
    </Modal>
  );
}
