import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth/useAuth";
import { LoginForm } from "./auth/LoginForm";
import { ForcePasswordChange } from "./auth/ForcePasswordChange";
import { Sidebar } from "./components/layout/Sidebar";
import { GlobalTopbar } from "./components/layout/GlobalTopbar";
import { MainArea } from "./components/layout/MainArea";
import { HomeView } from "./features/home/HomeView";
import { SharedWithMeView } from "./features/sharing/SharedWithMeView";
import { FavoritesView } from "./features/favorites/FavoritesView";
import { PublicShareView } from "./features/sharing/PublicShareView";
import { TrashView } from "./features/trash/TrashView";
import { MembersView } from "./features/members/MembersView";
import type { Folder, ViewSelection } from "./types/domain";

const publicShareMatch = window.location.pathname.match(/^\/s\/(.+)$/);

function App() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState<ViewSelection>({ kind: "home" });
  const [path, setPath] = useState<Folder[]>([]);
  const lastUserId = useRef<string | null | undefined>(undefined);

  const isGuest = profile?.role === "guest";

  // The app never fully reloads between accounts on the same tab (sign out
  // then straight into a new member's first login), so without this the new
  // account would inherit whatever view the previous one had left open -
  // including admin-only screens like Membros. Always land fresh on Home.
  useEffect(() => {
    const userId = session?.user.id ?? null;
    if (lastUserId.current !== undefined && lastUserId.current !== userId) {
      setView({ kind: "home" });
      setPath([]);
    }
    lastUserId.current = userId;
  }, [session?.user.id]);

  // Convidados have no personal drive, so their landing view is whatever was
  // shared with them - swap out the "home" default the moment we know that.
  useEffect(() => {
    if (isGuest && view.kind === "home") setView({ kind: "shared" });
  }, [isGuest, view.kind]);

  if (publicShareMatch) {
    return <PublicShareView token={publicShareMatch[1]} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="eyebrow text-brand-gray">Carregando…</p>
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  if (profile?.must_change_password) {
    return <ForcePasswordChange />;
  }

  function handleNavigateFolder(newPath: Folder[]) {
    setPath(newPath);
    setView({ kind: "folder", folderId: newPath.length ? newPath[newPath.length - 1].id : null });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <GlobalTopbar userEmail={session.user.email} profile={profile} onNavigateFolder={handleNavigateFolder} />

      <div className="flex flex-1 gap-6 overflow-hidden">
        <Sidebar
          view={view}
          path={path}
          userId={session.user.id}
          role={profile?.role ?? "user"}
          onNavigateFolder={handleNavigateFolder}
          onSelectHome={() => setView({ kind: "home" })}
          onSelectShared={() => setView({ kind: "shared" })}
          onSelectFavorites={() => setView({ kind: "favorites" })}
          onSelectTrash={() => setView({ kind: "trash" })}
          onSelectMembers={() => setView({ kind: "members" })}
        />

        {view.kind === "home" && <HomeView ownerId={session.user.id} />}

        {view.kind === "folder" && (
          <MainArea
            path={path}
            ownerId={session.user.id}
            userRole={profile?.role ?? "user"}
            restrictRootToOwner
            onNavigate={handleNavigateFolder}
          />
        )}

        {view.kind === "shared" && (
          <SharedWithMeView userId={session.user.id} userRole={profile?.role ?? "user"} />
        )}

        {view.kind === "favorites" && (
          <FavoritesView userId={session.user.id} userRole={profile?.role ?? "user"} />
        )}

        {view.kind === "trash" && <TrashView />}

        {view.kind === "members" && (profile?.role === "admin" || profile?.role === "manager") && (
          <MembersView
            currentUserId={session.user.id}
            currentUserEmail={session.user.email ?? ""}
            currentUserRole={profile?.role ?? "user"}
          />
        )}
      </div>
    </div>
  );
}

export default App;
