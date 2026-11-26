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
      <form onSubmit={handleSubmit} className="flex flex-col gap-gutter-md">
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
            className="flex items-start gap-3 rounded-xl border border-light-outline-variant px-4 py-3 text-left transition-colors duration-state-change hover:bg-light-surface-container-low sm:items-center"
          >
            <LockIcon
              className={`h-[18px] w-[18px] shrink-0 ${locked ? "text-light-primary" : "text-light-on-surface-variant"}`}
            />
            <span className="flex-1">
              <span className="block font-label text-label-lg text-light-on-surface">
                Trancar pasta
              </span>
              <span className="block font-body text-body-sm text-light-on-surface-variant">
                Convidados e usuarios nao poderao exclui-la, mesmo sendo donos
              </span>
            </span>
            <span
              aria-hidden
              className={`relative h-[22px] w-10 shrink-0 rounded-full border border-light-outline-variant transition-colors duration-state-change ${
                locked ? "bg-light-primary" : "bg-light-surface-container-high"
              }`}
            >
              <span
                className={`absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-light-surface-container-lowest shadow-sm transition-transform duration-surface-enter ease-surface-enter ${
                  locked ? "translate-x-[18px]" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        )}

        {error && <p role="alert" className="font-body text-body-sm text-light-error">{error}</p>}
        <div className="mt-2 flex flex-col-reverse gap-gutter-sm sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">
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
