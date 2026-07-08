import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { createFolder } from "./folderApi";
import type { Folder } from "../../types/domain";

export function CreateFolderDialog({
  title,
  parentId,
  ownerId,
  invalidateKeys,
  onCreated,
  onClose,
}: {
  title: string;
  parentId: string | null;
  ownerId: string;
  invalidateKeys: unknown[][];
  onCreated: (folder: Folder) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createFolder(name.trim(), parentId, ownerId),
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
        {error && <p className="text-sm text-brand-primary">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost border-transparent">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending || !name.trim()} className="btn-primary">
            {mutation.isPending ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
