import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../../components/ui/Modal";
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
      onClose();
    },
  });

  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-lg border border-brand-border p-2 dark:border-white/10">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
            selected === null
              ? "bg-brand-pale font-semibold dark:bg-white/10"
              : "hover:bg-brand-pale/50 dark:hover:bg-white/5"
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
            className={`rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
              selected === folder.id
                ? "bg-brand-pale font-semibold dark:bg-white/10"
                : "hover:bg-brand-pale/50 dark:hover:bg-white/5"
            }`}
          >
            {folder.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="btn-ghost w-full border-transparent sm:w-auto">
          Cancelar
        </button>
        <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className="btn-primary w-full sm:w-auto">
          Mover para ca
        </button>
      </div>
    </Modal>
  );
}
