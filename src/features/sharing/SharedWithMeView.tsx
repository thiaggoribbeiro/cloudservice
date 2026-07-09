import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { listSharedWithMe } from "./shareApi";
import { formatRelativeTime } from "../../lib/format";
import type { CreateActionTarget, Folder, UserRole } from "../../types/domain";

export function SharedWithMeView({
  userId,
  userRole,
  onActionTargetChange,
}: {
  userId: string;
  userRole: UserRole;
  onActionTargetChange?: (target: CreateActionTarget | null) => void;
}) {
  const [selectedRoot, setSelectedRoot] = useState<Folder | null>(null);
  const [subPath, setSubPath] = useState<Folder[]>([]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["sharedWithMe", userId],
    queryFn: () => listSharedWithMe(userId),
  });

  function publishActionTarget(folder: Folder | null) {
    onActionTargetChange?.(
      folder
        ? {
            folderId: folder.id,
            allowLock: !!folder.repository_id && (userRole === "admin" || userRole === "manager"),
          }
        : null,
    );
  }

  if (selectedRoot) {
    return (
      <MainArea
        path={[selectedRoot, ...subPath]}
        ownerId={userId}
        userRole={userRole}
        rootLabel="Compartilhado comigo"
        onNavigate={(newPath) => {
          if (newPath.length === 0) {
            setSelectedRoot(null);
            setSubPath([]);
            publishActionTarget(null);
            return;
          }
          setSelectedRoot(newPath[0]);
          setSubPath(newPath.slice(1));
          publishActionTarget(newPath[newPath.length - 1]);
        }}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Topbar path={[]} onNavigate={() => {}} title="Compartilhado comigo" />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <p className="eyebrow text-brand-gray">Carregando…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="Nada compartilhado com voce ainda"
            description="Pastas que outros usuarios compartilharem com voce aparecem aqui."
          />
        ) : (
          <>
            <div className="flex items-center gap-3 px-4 pb-2">
              <span className="eyebrow flex-1 text-brand-gray">Nome</span>
              <span className="eyebrow hidden w-28 shrink-0 text-right text-brand-gray sm:block">
                Modificado
              </span>
            </div>
            <div className="file-list">
              {entries.map(({ folder }) => (
                <div
                  key={folder.id}
                  onDoubleClick={() => {
                    setSelectedRoot(folder);
                    setSubPath([]);
                    publishActionTarget(folder);
                  }}
                  className="file-row"
                >
                  <span className="file-row-icon text-brand-primary">📁</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-black dark:text-white">
                    {folder.name}
                  </span>
                  <span className="mono-tag hidden w-28 shrink-0 text-right text-[12px] text-brand-gray sm:block">
                    {formatRelativeTime(folder.updated_at)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
