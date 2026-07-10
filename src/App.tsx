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
import { TrashView } from "./features/trash/TrashView";
import { MembersView } from "./features/members/MembersView";
import { RepositoriesView } from "./features/repositories/RepositoriesView";
import { EventLogView } from "./features/eventLog/EventLogView";
import type { CreateActionTarget, Folder, ViewSelection } from "./types/domain";

function App() {
  const { session, profile, loading } = useAuth();
  const [view, setView] = useState<ViewSelection>({ kind: "home" });
  const [path, setPath] = useState<Folder[]>([]);
  const [createActionTarget, setCreateActionTarget] = useState<CreateActionTarget | null>(null);
  // RepositoriesView, SharedWithMeView and FavoritesView each keep their own
  // "which root folder/subfolder am I inside" state internally, so simply
  // re-setting view to the already-active kind doesn't reset it - the
  // sidebar link would then look like it did nothing (worse, for guests it
  // also wipes createActionTarget below without leaving the folder view,
  // which was silently hiding "+ Criar ou carregar"). Bumping these keys
  // forces a remount, which does reset them.
  const [repositoriesResetKey, setRepositoriesResetKey] = useState(0);
  const [sharedResetKey, setSharedResetKey] = useState(0);
  const [favoritesResetKey, setFavoritesResetKey] = useState(0);
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
      setCreateActionTarget(null);
    }
    lastUserId.current = userId;
  }, [session?.user.id]);

  // Convidados have no personal drive, so their landing view is whatever was
  // shared with them - swap out the "home" default the moment we know that.
  useEffect(() => {
    if (isGuest && view.kind === "home") setView({ kind: "shared" });
  }, [isGuest, view.kind]);

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
    setCreateActionTarget(null);
    setView({ kind: "folder", folderId: newPath.length ? newPath[newPath.length - 1].id : null });
  }

  // Guests have no personal "Home" (see the effect above), so the logo
  // always lands on whichever view is that user's actual starting point.
  function handleGoHome() {
    setCreateActionTarget(null);
    setView(isGuest ? { kind: "shared" } : { kind: "home" });
  }

  return (
    <div className="flex h-screen min-w-0 flex-col overflow-hidden">
      <GlobalTopbar
        userEmail={session.user.email}
        profile={profile}
        onNavigateFolder={handleNavigateFolder}
        onGoHome={handleGoHome}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden md:flex-row md:gap-3 lg:gap-6">
        <Sidebar
          view={view}
          path={path}
          userId={session.user.id}
          role={profile?.role ?? "user"}
          actionTarget={view.kind === "shared" || view.kind === "repositories" ? createActionTarget : undefined}
          onNavigateFolder={handleNavigateFolder}
          onSelectHome={() => setView({ kind: "home" })}
          onSelectShared={() => {
            setCreateActionTarget(null);
            setView({ kind: "shared" });
            setSharedResetKey((key) => key + 1);
          }}
          onSelectFavorites={() => {
            setView({ kind: "favorites" });
            setFavoritesResetKey((key) => key + 1);
          }}
          onSelectTrash={() => setView({ kind: "trash" })}
          onSelectMembers={() => setView({ kind: "members" })}
          onSelectRepositories={() => {
            setCreateActionTarget(null);
            setView({ kind: "repositories" });
            setRepositoriesResetKey((key) => key + 1);
          }}
          onSelectEventLog={() => setView({ kind: "eventLog" })}
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
          <SharedWithMeView
            key={sharedResetKey}
            userId={session.user.id}
            userRole={profile?.role ?? "user"}
            onActionTargetChange={setCreateActionTarget}
          />
        )}

        {view.kind === "favorites" && (
          <FavoritesView key={favoritesResetKey} userId={session.user.id} userRole={profile?.role ?? "user"} />
        )}

        {view.kind === "trash" && <TrashView />}

        {view.kind === "members" && (profile?.role === "admin" || profile?.role === "manager") && (
          <MembersView
            currentUserId={session.user.id}
            currentUserEmail={session.user.email ?? ""}
            currentUserRole={profile?.role ?? "user"}
          />
        )}

        {view.kind === "repositories" && (profile?.role === "admin" || profile?.role === "manager") && (
          <RepositoriesView
            key={repositoriesResetKey}
            userId={session.user.id}
            userRole={profile?.role ?? "user"}
            onActionTargetChange={setCreateActionTarget}
          />
        )}

        {view.kind === "eventLog" && (profile?.role === "admin" || profile?.role === "manager") && (
          <EventLogView />
        )}
      </div>
    </div>
  );
}

export default App;
