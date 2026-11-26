import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
import { useToast } from "../../components/ui/Toast";
import { listAllFoldersFlat } from "./folderApi";
import type { Folder } from "../../types/domain";

type TreeNode = { folder: Folder; depth: number };

function buildFlatTree(folders: Folder[], excludedIds: Set<string>): TreeNode[] {
  const byParent = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    if (excludedIds.has(folder.id)) continue;
    const list = byParent.get(folder.parent_id) ?? [];
    list.push(folder);
    byParent.set(folder.parent_id, list);
  }

  const result: TreeNode[] = [];
  function walk(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      result.push({ folder: child, depth });
      walk(child.id, depth + 1);
    }
  }
  walk(null, 0);
  return result;
}

function collectDescendantIds(folders: Folder[], rootId: string): Set<string> {
  const excluded = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parent_id && excluded.has(folder.parent_id) && !excluded.has(folder.id)) {
        excluded.add(folder.id);
        changed = true;
      }
    }
  }
  return excluded;
}

export function MoveDialog({
  title,
  excludeFolderId,
  invalidateKeys,
  onMove,
  onClose,
}: {
  title: string;
  excludeFolderId?: string;
  invalidateKeys: unknown[][];
  onMove: (targetParentId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const showToast = useToast();

  const { data: folders = [] } = useQuery({
    queryKey: ["allFoldersFlat"],
    queryFn: listAllFoldersFlat,
  });

  const excludedIds = useMemo(
    () => (excludeFolderId ? collectDescendantIds(folders, excludeFolderId) : new Set<string>()),
    [folders, excludeFolderId],
  );

  const tree = useMemo(() => buildFlatTree(folders, excludedIds), [folders, excludedIds]);

  const mutation = useMutation({
    mutationFn: () => onMove(selected),
    onSuccess: () => {
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      showToast("success", "Movido com sucesso.");
      onClose();
    },
    // Sem isso, um erro do backend (RLS, ou o trigger que impede mover
    // pastas entre repositórios) era descartado em silêncio -- o diálogo só
    // fechava ou ficava parado, sem nenhum sinal de que nada tinha ido.
    onError: (error: unknown) => {
      showToast("error", error instanceof Error ? error.message : "Não foi possível mover.");
    },
  });

  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-xl border border-light-outline-variant p-1.5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={`rounded-lg px-3 py-2 text-left font-body text-body-md transition-colors duration-state-change ${
            selected === null
              ? "bg-light-secondary-container font-bold text-light-on-secondary-container"
              : "text-light-on-surface hover:bg-light-surface-container"
          }`}
        >
          Meu Drive (raiz)
        </button>
        {tree.map(({ folder, depth }) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => setSelected(folder.id)}
            style={{ paddingLeft: `${depth * 16 + 10}px` }}
            className={`truncate rounded-lg px-3 py-2 text-left font-body text-body-md transition-colors duration-state-change ${
              selected === folder.id
                ? "bg-light-secondary-container font-bold text-light-on-secondary-container"
                : "text-light-on-surface hover:bg-light-surface-container"
            }`}
          >
            {folder.name}
          </button>
        ))}
      </div>

      <div className="mt-gutter-lg flex flex-col-reverse gap-gutter-sm sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="btn-ghost w-full sm:w-auto">
          Cancelar
        </button>
        <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="btn-primary w-full sm:w-auto">
          Mover para ca
        </button>
      </div>
    </Modal>
  );
}
