import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../../components/layout/Topbar";
import { MainArea } from "../../components/layout/MainArea";
import { EmptyState } from "../../components/ui/EmptyState";
import { listSharedWithMe } from "./shareApi";
import type { Folder } from "../../types/domain";

export function SharedWithMeView({ userId }: { userId: string }) {
  const [selectedRoot, setSelectedRoot] = useState<Folder | null>(null);
  const [subPath, setSubPath] = useState<Folder[]>([]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["sharedWithMe", userId],
    queryFn: () => listSharedWithMe(userId),
  });

  if (selectedRoot) {
    return (
      <MainArea
        path={[selectedRoot, ...subPath]}
        ownerId={userId}
        rootLabel="Compartilhado comigo"
        onNavigate={(newPath) => {
          if (newPath.length === 0) {
            setSelectedRoot(null);
            setSubPath([]);
            return;
          }
          setSelectedRoot(newPath[0]);
          setSubPath(newPath.slice(1));
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
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {entries.map(({ folder }) => (
              <div key={folder.id} onDoubleClick={() => setSelectedRoot(folder)} className="tile">
                <span className="tile-icon text-brand-primary">📁</span>
                <span className="w-full truncate text-center text-sm font-medium text-brand-black">
                  {folder.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
