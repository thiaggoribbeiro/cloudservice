import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import {
  createRepository,
  REPOSITORY_QUOTA_MIN_BYTES,
  REPOSITORY_QUOTA_MAX_BYTES,
  REPOSITORY_QUOTA_DEFAULT_BYTES,
} from "./repositoryApi";
import type { Folder } from "../../types/domain";

const GIB = 1073741824;

export function CreateRepositoryDialog({
  onCreated,
  onClose,
}: {
  onCreated: (rootFolder: Folder) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [quotaGib, setQuotaGib] = useState((REPOSITORY_QUOTA_DEFAULT_BYTES / GIB).toString());
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createRepository(name.trim(), Math.round(Number(quotaGib) * GIB)),
    onSuccess: ({ rootFolder }) => onCreated(rootFolder),
    onError: () => setError("Nao foi possivel criar o repositorio."),
  });

  const quotaBytes = Math.round(Number(quotaGib) * GIB);
  const quotaValid =
    !Number.isNaN(quotaBytes) &&
    quotaBytes >= REPOSITORY_QUOTA_MIN_BYTES &&
    quotaBytes <= REPOSITORY_QUOTA_MAX_BYTES;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !quotaValid) return;
    setError(null);
    mutation.mutate();
  }

  return (
    <Modal title="Novo repositorio" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="repo-name" className="eyebrow text-brand-gray">
            Nome do repositorio
          </label>
          <input
            id="repo-name"
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Projetos do time"
            className="field-input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="repo-quota" className="eyebrow text-brand-gray">
            Cota inicial (GB, 1 a 10)
          </label>
          <input
            id="repo-quota"
            type="number"
            min={REPOSITORY_QUOTA_MIN_BYTES / GIB}
            max={REPOSITORY_QUOTA_MAX_BYTES / GIB}
            step={0.5}
            value={quotaGib}
            onChange={(e) => setQuotaGib(e.target.value)}
            className="field-input"
          />
          {!quotaValid && (
            <p className="text-xs text-brand-gray">A cota deve estar entre 1 GB e 10 GB.</p>
          )}
        </div>

        {error && <p className="text-sm text-brand-primary">{error}</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn-ghost w-full border-transparent sm:w-auto">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={mutation.isPending || !name.trim() || !quotaValid}
            className="btn-primary w-full sm:w-auto"
          >
            {mutation.isPending ? "Criando…" : "Criar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
