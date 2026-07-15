import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
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
      <Topbar path={[]} onNavigate={() => {}} title="Membros" />

      <div className="flex flex-col gap-3 border-b border-brand-border px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="mono-tag text-xs text-brand-gray">
          {members.length} {members.length === 1 ? "membro cadastrado" : "membros cadastrados"}
        </p>
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
          className="btn-primary w-full text-sm sm:w-auto"
        >
          + Novo membro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {isLoading ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : members.length === 0 ? (
          <EmptyState title="Nenhum membro ainda" description="Crie o primeiro membro da equipe." />
        ) : (
          <>
            <div className={`${MEMBER_ROW_GRID} px-4 pb-2`}>
              <span className="eyebrow text-brand-gray">Usuario</span>
              <span className="eyebrow hidden text-brand-gray sm:block">E-mail</span>
              <span className="eyebrow hidden text-brand-gray lg:block">Nivel de acesso</span>
              <span className="eyebrow text-center text-brand-gray">Acoes</span>
            </div>

            <div className="file-list">
              {members.map((member) => {
                const canManage = member.id !== currentUserId && member.role !== "admin";
                const name = member.display_name || member.email;

                return (
                  <div key={member.id} className={`file-row cursor-default ${MEMBER_ROW_GRID}`}>
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-xs font-bold text-white">
                        {getInitials(member.display_name, member.email)}
                      </span>
                      <span className="truncate text-sm font-medium text-brand-black dark:text-white">
                        {name}
                      </span>
                    </span>

                    <span className="mono-tag hidden min-w-0 truncate text-[12px] text-brand-gray sm:block">
                      {member.email}
                    </span>
                    <span className="hidden min-w-0 lg:block">
                      <span className="eyebrow inline-block rounded-full border border-brand-border px-2.5 py-1 text-brand-primary dark:border-white/15">
                        {ROLE_LABEL[member.role]}
                      </span>
                    </span>

                    {canManage ? (
                      <div className="relative flex justify-center">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          data-item-menu-trigger
                          className="rounded-md px-1.5 py-0.5 text-brand-gray transition-colors hover:bg-brand-pale/60 dark:hover:bg-white/10"
                          aria-label="Mais opcoes"
                        >
                          ⋮
                        </button>
                        {openMenuId === member.id && (
                          <div
                            data-item-menu
                            className="stagger-0 absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-brand-border bg-white py-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget(member);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-3.5 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/50 dark:text-white dark:hover:bg-white/10"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(member);
                                setOpenMenuId(null);
                              }}
                              className="block w-full px-3.5 py-2 text-left text-sm text-brand-primary transition-colors hover:bg-brand-pale/50 dark:hover:bg-white/10"
                            >
                              Excluir
                            </button>
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
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="eyebrow text-brand-gray">Nome de exibicao</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="field-input"
            placeholder="Nome completo"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="eyebrow text-brand-gray">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
            placeholder="pessoa@empresa.com.br"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="eyebrow text-brand-gray">Acesso</label>
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
          <div className="flex flex-col gap-1 sm:col-span-2">
            <label className="eyebrow text-brand-gray">Pasta compartilhada</label>
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
              <p className="text-xs text-brand-gray">
                {currentUserRole === "admin"
                  ? "Nenhuma pasta encontrada no sistema."
                  : "Voce ainda nao possui pastas para compartilhar."}
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-brand-primary sm:col-span-2">{error}</p>}

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
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="edit-display-name" className="eyebrow text-brand-gray">
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

        <div className="flex flex-col gap-1">
          <label htmlFor="edit-role" className="eyebrow text-brand-gray">
            Acesso
          </label>
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
        </div>

        {error && <p className="text-sm text-brand-primary sm:col-span-2">{error}</p>}

        <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full py-2.5 sm:col-span-2">
          {updateMutation.isPending ? "Salvando…" : "Salvar alteracoes"}
        </button>

        <div className="border-t border-brand-border pt-4 dark:border-white/10 sm:col-span-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              resetMutation.mutate();
            }}
            disabled={resetMutation.isPending}
            className="btn-ghost w-full py-2.5 text-sm"
          >
            {resetMutation.isPending ? "Gerando senha…" : "Resetar senha"}
          </button>
          <p className="mt-2 text-xs text-brand-gray">
            Gera uma nova senha provisoria; o membro devera definir uma nova senha no proximo acesso.
          </p>
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
        <p className="text-sm text-brand-gray">
          Repasse esta senha provisoria para <span className="font-medium text-brand-black dark:text-white">{result.email}</span>.
          Ao entrar com ela, sera solicitada a criacao de uma nova senha.
        </p>

        <div className="flex flex-col gap-2 rounded-lg border border-brand-border bg-brand-pale/30 px-4 py-3 dark:border-white/10 dark:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between">
          <span className="mono-tag break-all text-base text-brand-black dark:text-white">{result.temporary_password}</span>
          <button type="button" onClick={copy} className="btn-ghost shrink-0 px-3 py-1.5 text-sm">
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
