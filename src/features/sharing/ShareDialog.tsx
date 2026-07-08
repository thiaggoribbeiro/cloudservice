import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import type { Folder, FileRow } from "../../types/domain";
import {
  listFolderShares,
  listShareableUsers,
  shareFolderWithUsers,
  revokeFolderShare,
  listShareLinksForFile,
  listShareLinksForFolder,
  createShareLinkForFile,
  createShareLinkForFolder,
  revokeShareLink,
  shareLinkUrl,
} from "./shareApi";

type ShareTarget = { kind: "folder"; folder: Folder } | { kind: "file"; file: FileRow };

export function ShareDialog({
  target,
  currentUserId,
  onClose,
}: {
  target: ShareTarget;
  currentUserId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"users" | "link">(target.kind === "folder" ? "users" : "link");
  const itemId = target.kind === "folder" ? target.folder.id : target.file.id;
  const itemName = target.kind === "folder" ? target.folder.name : target.file.name;

  return (
    <Modal title={`Compartilhar "${itemName}"`} onClose={onClose}>
      {target.kind === "folder" && (
        <div className="eyebrow mb-5 flex gap-5 border-b border-brand-border dark:border-white/10">
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`-mb-px border-b-2 pb-2.5 transition-colors ${
              tab === "users" ? "border-brand-primary text-brand-black dark:text-white" : "border-transparent text-brand-gray"
            }`}
          >
            Com usuario
          </button>
          <button
            type="button"
            onClick={() => setTab("link")}
            className={`-mb-px border-b-2 pb-2.5 transition-colors ${
              tab === "link" ? "border-brand-primary text-brand-black dark:text-white" : "border-transparent text-brand-gray"
            }`}
          >
            Link publico
          </button>
        </div>
      )}

      {tab === "users" && target.kind === "folder" && (
        <UsersTab folder={target.folder} currentUserId={currentUserId} />
      )}
      {tab === "link" && <LinkTab itemId={itemId} kind={target.kind} currentUserId={currentUserId} />}
    </Modal>
  );
}

function UsersTab({ folder, currentUserId }: { folder: Folder; currentUserId: string }) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: shares = [] } = useQuery({
    queryKey: ["folderShares", folder.id],
    queryFn: () => listFolderShares(folder.id),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["shareableUsers"],
    queryFn: listShareableUsers,
  });

  const alreadySharedIds = new Set(shares.map((s) => s.shared_with_user_id));
  const candidates = allUsers.filter((u) => u.id !== currentUserId && !alreadySharedIds.has(u.id));

  const shareMutation = useMutation({
    mutationFn: () => shareFolderWithUsers(folder.id, Array.from(selectedIds), currentUserId),
    onSuccess: () => {
      setSelectedIds(new Set());
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["folderShares", folder.id] });
    },
    onError: (err: Error) => setError(err.message || "Nao foi possivel compartilhar."),
  });

  const revokeMutation = useMutation({
    mutationFn: revokeFolderShare,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["folderShares", folder.id] }),
  });

  function toggleSelected(userId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (selectedIds.size === 0) return;
    shareMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {candidates.length === 0 ? (
          <p className="text-sm text-brand-gray">Nenhum membro disponivel para adicionar.</p>
        ) : (
          <div className="flex max-h-48 flex-col overflow-y-auto rounded-lg border border-brand-border dark:border-white/10">
            {candidates.map((u) => (
              <label
                key={u.id}
                className="flex cursor-pointer items-center gap-2.5 border-b border-brand-border px-3.5 py-2.5 text-sm last:border-b-0 hover:bg-brand-pale/20 dark:border-white/10 dark:hover:bg-white/[0.06]"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(u.id)}
                  onChange={() => toggleSelected(u.id)}
                  className="h-4 w-4 shrink-0 accent-brand-primary"
                />
                <span className="truncate">{u.display_name ? `${u.display_name} — ${u.email}` : u.email}</span>
              </label>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={shareMutation.isPending || selectedIds.size === 0}
          className="btn-primary w-full py-2.5"
        >
          {selectedIds.size > 1 ? `Compartilhar com ${selectedIds.size} membros` : "Compartilhar"}
        </button>
      </form>
      {error && <p className="text-sm text-brand-primary">{error}</p>}

      <div className="flex flex-col gap-1.5">
        {shares.length === 0 && (
          <p className="text-sm text-brand-gray">Esta pasta ainda nao foi compartilhada.</p>
        )}
        {shares.map((share) => (
          <div
            key={share.id}
            className="flex items-center justify-between rounded-lg border border-brand-border px-3.5 py-2.5 text-sm dark:border-white/10"
          >
            <span className="truncate">{share.profile?.display_name || share.profile?.email}</span>
            <button
              type="button"
              onClick={() => revokeMutation.mutate(share.id)}
              className="shrink-0 text-brand-primary hover:underline"
            >
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkTab({
  itemId,
  kind,
  currentUserId,
}: {
  itemId: string;
  kind: "folder" | "file";
  currentUserId: string;
}) {
  const [expiresAt, setExpiresAt] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const queryKey = ["shareLinks", kind, itemId];

  const { data: links = [] } = useQuery({
    queryKey,
    queryFn: () => (kind === "folder" ? listShareLinksForFolder(itemId) : listShareLinksForFile(itemId)),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const expiresIso = expiresAt ? new Date(expiresAt).toISOString() : null;
      return kind === "folder"
        ? createShareLinkForFolder(itemId, currentUserId, expiresIso)
        : createShareLinkForFile(itemId, currentUserId, expiresIso);
    },
    onSuccess: () => {
      setExpiresAt("");
      queryClient.invalidateQueries({ queryKey });
    },
  });

  if (createMutation.isError) {
    console.error("Falha ao criar link publico:", createMutation.error);
  }

  const revokeMutation = useMutation({
    mutationFn: revokeShareLink,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  async function copyToClipboard(token: string, id: string) {
    await navigator.clipboard.writeText(shareLinkUrl(token));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label className="eyebrow text-brand-gray">Expira em (opcional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="field-input"
          />
        </div>
        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="btn-primary shrink-0 px-3.5 py-2"
        >
          Criar link
        </button>
      </div>
      {createMutation.isError && (
        <p className="text-sm text-brand-primary">Nao foi possivel criar o link publico.</p>
      )}

      <div className="flex flex-col gap-1.5">
        {links.length === 0 && <p className="text-sm text-brand-gray">Nenhum link publico criado.</p>}
        {links.map((link) => (
          <div
            key={link.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-brand-border px-3.5 py-2.5 text-sm dark:border-white/10"
          >
            <span className="mono-tag truncate text-[0.8rem] text-brand-black dark:text-white">{shareLinkUrl(link.token)}</span>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => copyToClipboard(link.token, link.id)}
                className="text-brand-primary hover:underline"
              >
                {copiedId === link.id ? "Copiado!" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={() => revokeMutation.mutate(link.id)}
                className="text-brand-gray hover:underline"
              >
                Revogar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
