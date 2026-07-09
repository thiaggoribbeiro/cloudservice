import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createFolder } from "./folderApi";
import { LockIcon } from "../../components/ui/icons";
import type { Folder } from "../../types/domain";

export function CreateFolderDialog({
  title,
  parentId,
  ownerId,
  invalidateKeys,
  allowLock,
  onCreated,
  onClose,
}: {
  title: string;
  parentId: string | null;
  ownerId: string;
  invalidateKeys: unknown[][];
  allowLock?: boolean;
  onCreated: (folder: Folder) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createFolder(name.trim(), parentId, ownerId, locked),
    onSuccess: (folder) => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      onCreated(folder);
    },
    onError: () => setError("Nao foi possivel criar a pasta. Verifique se o nome ja existe."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da pasta"
          className="field-input"
        />

        {allowLock && (
          <button
            type="button"
            onClick={() => setLocked((l) => !l)}
            className="flex items-start gap-3 rounded-lg border border-brand-border px-3.5 py-2.5 text-left transition-colors dark:border-white/10 sm:items-center"
          >
            <LockIcon
              className={`h-[18px] w-[18px] shrink-0 ${locked ? "text-brand-primary" : "text-brand-gray"}`}
            />
            <span className="flex-1">
              <span className="block text-sm font-medium text-brand-black dark:text-white">
                Trancar pasta
              </span>
              <span className="block text-xs text-brand-gray">
                Convidados e usuarios nao poderao exclui-la, mesmo sendo donos
              </span>
            </span>
            <span
              aria-hidden
              className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                locked ? "bg-brand-primary" : "bg-black/15 dark:bg-white/20"
              }`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  locked ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </span>
          </button>
        )}

        {error && <p className="text-sm text-brand-primary">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost w-full border-transparent sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending || !name.trim()} className="btn-primary w-full sm:w-auto">
            {mutation.isPending ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
