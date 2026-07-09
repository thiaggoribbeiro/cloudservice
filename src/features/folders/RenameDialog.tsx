import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";

export function RenameDialog({
  title,
  currentName,
  invalidateKeys,
  onRename,
  onClose,
}: {
  title: string;
  currentName: string;
  invalidateKeys: unknown[][];
  onRename: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => onRename(name.trim()),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      onClose();
    },
    onError: () => setError("Nao foi possivel renomear. Verifique se o nome ja existe."),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
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
          className="field-input"
        />
        {error && <p className="text-sm text-brand-primary">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost w-full border-transparent sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary w-full sm:w-auto">
            Renomear
          </button>
        </div>
      </form>
    </Modal>
  );
}
