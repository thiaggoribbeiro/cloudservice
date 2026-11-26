import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { EmptyState } from "../../components/ui/EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatBytes } from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { FolderTileIcon, TrashIcon } from "../../components/ui/icons";
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
      <span className="badge badge-neutral" title="Itens ficam 30 dias na lixeira antes de poderem ser excluidos para sempre">
        Disponivel em {daysLeft} {daysLeft === 1 ? "dia" : "dias"}
      </span>
    );
  }

  return (
    <button type="button" onClick={onConfirm} className="rounded-lg px-2 py-1 font-label text-label-md text-light-error transition-colors duration-state-change hover:bg-light-error-container/50">
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
      <Topbar
        path={[]}
        onNavigate={() => {}}
        title="Lixeira"
        subtitle="Itens ficam aqui por 30 dias antes da exclusão definitiva."
        actions={
          hasEligibleItems && (
            <button type="button" onClick={() => setConfirmEmptyTrash(true)} className="btn-ghost text-light-error">
              <TrashIcon className="h-[18px] w-[18px]" />
              Esvaziar lixeira
            </button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
        {isEmpty ? (
          <EmptyState title="Lixeira vazia" description="Itens excluidos aparecem aqui por 30 dias." />
        ) : (
          <div className="file-list">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="file-row flex items-center justify-between"
              >
                <span className="flex min-w-0 items-center gap-3 truncate font-body text-body-md text-light-on-surface">
                  <FolderTileIcon className="h-9 w-9 shrink-0" />
                  {folder.name}
                </span>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => restoreFolderMutation.mutate(folder.id)}
                    className="font-label text-label-md text-light-primary hover:underline"
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
                className="file-row flex items-center justify-between"
              >
                <span className="flex min-w-0 items-center gap-3 truncate font-body text-body-md text-light-on-surface">
                  <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-9 w-9 shrink-0" />
                  {file.name}
                  <span className="mono-tag shrink-0 text-[12px] text-light-on-surface-variant">
                    {formatBytes(file.size_bytes)}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => restoreFileMutation.mutate(file.id)}
                    className="font-label text-label-md text-light-primary hover:underline"
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
