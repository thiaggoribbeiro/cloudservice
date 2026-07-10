import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import type { Folder } from "../../types/domain";
import {
  listFolderShares,
  listShareableUsers,
  shareFolderWithUsers,
  revokeFolderShare,
} from "./shareApi";

// The only remaining caller is "Convidar" on a repository's root folder -
// per-item sharing of arbitrary files/folders and public links were removed
// so ownership stays meaningful (see FileGrid's rename/move restriction).
export function ShareDialog({
  folder,
  currentUserId,
  onClose,
}: {
  folder: Folder;
  currentUserId: string;
  onClose: () => void;
}) {
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

  const alreadyInvitedIds = new Set(shares.map((s) => s.shared_with_user_id));
  const candidates = allUsers.filter((u) => u.id !== currentUserId && !alreadyInvitedIds.has(u.id));

  const inviteMutation = useMutation({
    mutationFn: () => shareFolderWithUsers(folder.id, Array.from(selectedIds), currentUserId),
    onSuccess: () => {
      setSelectedIds(new Set());
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["folderShares", folder.id] });
    },
    onError: (err: Error) => setError(err.message || "Nao foi possivel convidar."),
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
    inviteMutation.mutate();
  }

  return (
    <Modal title={`Convidar para "${folder.name}"`} onClose={onClose}>
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
            disabled={inviteMutation.isPending || selectedIds.size === 0}
            className="btn-primary w-full py-2.5"
          >
            {selectedIds.size > 1 ? `Convidar ${selectedIds.size} membros` : "Convidar"}
          </button>
        </form>
        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <div className="flex flex-col gap-1.5">
          {shares.length === 0 && (
            <p className="text-sm text-brand-gray">Ainda nao ha convidados nesta pasta.</p>
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
    </Modal>
  );
}
