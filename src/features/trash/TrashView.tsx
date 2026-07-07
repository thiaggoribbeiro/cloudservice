import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { fileIconFor, formatBytes } from "../../lib/format";
import {
  listTrashedFolders,
  listTrashedFiles,
  restoreFolder,
  restoreFile,
  permanentlyDeleteFolder,
  permanentlyDeleteFile,
  emptyTrash,
  daysRemainingInTrash,
} from "./trashApi";
import type { Folder, FileRow } from "../../types/domain";

function DeleteAction({ deletedAt, onConfirm }: { deletedAt: string | null; onConfirm: () => void }) {
  const daysLeft = deletedAt ? daysRemainingInTrash(deletedAt) : 0;

  if (daysLeft > 0) {
    return (
      <span className="mono-tag text-[11px] text-brand-gray" title="Itens ficam 30 dias na lixeira antes de poderem ser excluidos para sempre">
        Disponivel em {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
      </span>
    );
  }

  return (
    <button type="button" onClick={onConfirm} className="text-sm text-brand-gray hover:text-brand-black hover:underline">
      Excluir definitivamente
    </button>
  );
}

export function TrashView() {
  const queryClient = useQueryClient();
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<Folder | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<FileRow | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["trashedFolders"],
    queryFn: listTrashedFolders,
  });
  const { data: files = [] } = useQuery({
    queryKey: ["trashedFiles"],
    queryFn: listTrashedFiles,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["trashedFolders"] });
    queryClient.invalidateQueries({ queryKey: ["trashedFiles"] });
    queryClient.invalidateQueries({ queryKey: ["folderChildren"] });
    queryClient.invalidateQueries({ queryKey: ["files"] });
    queryClient.invalidateQueries({ queryKey: ["storageUsage"] });
  }

  const restoreFolderMutation = useMutation({
    mutationFn: restoreFolder,
    onSuccess: invalidateAll,
  });
  const restoreFileMutation = useMutation({
    mutationFn: restoreFile,
    onSuccess: invalidateAll,
  });
  const deleteFolderMutation = useMutation({
    mutationFn: permanentlyDeleteFolder,
    onSuccess: invalidateAll,
  });
  const deleteFileMutation = useMutation({
    mutationFn: permanentlyDeleteFile,
    onSuccess: invalidateAll,
  });
  const emptyTrashMutation = useMutation({
    mutationFn: emptyTrash,
    onSuccess: invalidateAll,
  });

  const isEmpty = folders.length === 0 && files.length === 0;
  const hasEligibleItems =
    folders.some((f) => daysRemainingInTrash(f.deleted_at!) === 0) ||
    files.some((f) => daysRemainingInTrash(f.deleted_at!) === 0);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Lixeira" />
      <div className="flex items-center justify-between border-b border-brand-border px-6 py-3">
        <p className="mono-tag text-xs text-brand-gray">
          Itens ficam aqui por 30 dias antes da exclusao definitiva
        </p>
        {hasEligibleItems && (
          <button type="button" onClick={() => setConfirmEmptyTrash(true)} className="btn-ghost text-sm">
            Esvaziar lixeira
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isEmpty ? (
          <EmptyState title="Lixeira vazia" description="Itens excluidos aparecem aqui por 30 dias." />
        ) : (
          <div className="flex flex-col gap-2">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between rounded-lg border border-brand-border px-4 py-2.5"
              >
                <span className="flex items-center gap-2.5 truncate text-sm font-medium">
                  <span className="tile-icon h-8 w-8 text-base text-brand-primary">📁</span>
                  {folder.name}
                </span>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => restoreFolderMutation.mutate(folder.id)}
                    className="text-sm font-medium text-brand-primary hover:underline"
                  >
                    Restaurar
                  </button>
                  <DeleteAction
                    deletedAt={folder.deleted_at}
                    onConfirm={() => setConfirmDeleteFolder(folder)}
                  />
                </div>
              </div>
            ))}

            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-lg border border-brand-border px-4 py-2.5"
              >
                <span className="flex items-center gap-2.5 truncate text-sm font-medium">
                  <span className="tile-icon h-8 w-8 text-base">{fileIconFor(file.mime_type)}</span>
                  {file.name}
                  <span className="mono-tag shrink-0 text-[11px] font-normal text-brand-gray">
                    {formatBytes(file.size_bytes)}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => restoreFileMutation.mutate(file.id)}
                    className="text-sm font-medium text-brand-primary hover:underline"
                  >
                    Restaurar
                  </button>
                  <DeleteAction
                    deletedAt={file.deleted_at}
                    onConfirm={() => setConfirmDeleteFile(file)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmEmptyTrash && (
        <ConfirmDialog
          title="Esvaziar lixeira"
          message="Todos os itens com 30 dias ou mais na lixeira serao excluidos permanentemente. Essa acao nao pode ser desfeita."
          confirmLabel="Esvaziar"
          onConfirm={() => emptyTrashMutation.mutate()}
          onClose={() => setConfirmEmptyTrash(false)}
        />
      )}
      {confirmDeleteFolder && (
        <ConfirmDialog
          title="Excluir pasta permanentemente"
          message={`A pasta "${confirmDeleteFolder.name}" e todo o seu conteudo serao excluidos permanentemente.`}
          confirmLabel="Excluir"
          onConfirm={() => deleteFolderMutation.mutate(confirmDeleteFolder.id)}
          onClose={() => setConfirmDeleteFolder(null)}
        />
      )}
      {confirmDeleteFile && (
        <ConfirmDialog
          title="Excluir arquivo permanentemente"
          message={`O arquivo "${confirmDeleteFile.name}" sera excluido permanentemente.`}
          confirmLabel="Excluir"
          onConfirm={() => deleteFileMutation.mutate(confirmDeleteFile)}
          onClose={() => setConfirmDeleteFile(null)}
        />
      )}
    </div>
  );
}
