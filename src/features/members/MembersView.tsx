import { useState, type FormEvent } from "react";
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

const ASSIGNABLE_ROLES: Exclude<UserRole, "admin">[] = ["user", "guest", "manager"];

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
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: listMembers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMember,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

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
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Membros" />

      <div className="flex items-center justify-between border-b border-brand-border px-6 py-3">
        <p className="mono-tag text-xs text-brand-gray">
          {members.length} {members.length === 1 ? "membro cadastrado" : "membros cadastrados"}
        </p>
        <button type="button" onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          + Novo membro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : members.length === 0 ? (
          <EmptyState title="Nenhum membro ainda" description="Crie o primeiro membro da equipe." />
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((member) => {
              const canManage = member.id !== currentUserId && member.role !== "admin";
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-brand-border px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-brand-black">
                      {member.display_name || member.email}
                    </span>
                    <span className="mono-tag truncate text-[11px] text-brand-gray">{member.email}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="eyebrow rounded-full border border-brand-border px-2.5 py-1 text-brand-primary">
                      {ROLE_LABEL[member.role]}
                    </span>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditTarget(member)}
                          className="text-sm font-medium text-brand-primary hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(member)}
                          className="text-sm text-brand-gray hover:text-brand-black hover:underline"
                        >
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
        folder_id: role === "guest" ? folderId : undefined,
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
      setError("Selecione a pasta que o convidado ira acessar.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <Modal title="Novo membro" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <div className="flex flex-col gap-1">
            <label className="eyebrow text-brand-gray">Pasta compartilhada</label>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="field-input">
              <option value="">Selecione uma pasta…</option>
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

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <button type="submit" disabled={createMutation.isPending} className="btn-primary w-full py-2.5">
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <button type="submit" disabled={updateMutation.isPending} className="btn-primary w-full py-2.5">
          {updateMutation.isPending ? "Salvando…" : "Salvar alteracoes"}
        </button>

        <div className="border-t border-brand-border pt-4">
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
          Repasse esta senha provisoria para <span className="font-medium text-brand-black">{result.email}</span>.
          Ao entrar com ela, sera solicitada a criacao de uma nova senha.
        </p>

        <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-border bg-brand-pale/30 px-4 py-3">
          <span className="mono-tag text-base text-brand-black">{result.temporary_password}</span>
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
