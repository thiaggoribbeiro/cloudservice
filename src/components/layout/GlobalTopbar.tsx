import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { ROLE_LABEL } from "../../lib/roleLabels";
import { formatBytes, isPreviewable } from "../../lib/format";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { searchFilesAndFolders, buildFolderPath } from "../../features/search/searchApi";
import { downloadFile } from "../../features/files/fileApi";
import { PreviewModal } from "../../features/files/PreviewModal";
import { useTheme } from "../../lib/useTheme";
import { SearchIcon, FolderIcon, SunIcon, MoonIcon } from "../ui/icons";
import { logEvent } from "../../features/eventLog/eventLogApi";
import type { FileRow, Folder, Profile } from "../../types/domain";

function getInitials(name: string | null | undefined, email: string | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/);
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
  }
  return (email ?? "?").slice(0, 2).toUpperCase();
}

export function GlobalTopbar({
  userEmail,
  profile,
  onNavigateFolder,
}: {
  userEmail: string | undefined;
  profile: Profile | null;
  onNavigateFolder: (path: Folder[]) => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileRow | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (searchRef.current && !searchRef.current.contains(target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const { data: results, isFetching } = useQuery({
    queryKey: ["globalSearch", debounced],
    queryFn: () => searchFilesAndFolders(debounced),
    enabled: debounced.length >= 2,
  });

  async function handleFolderResult(folder: Folder) {
    const path = await buildFolderPath(folder.id);
    onNavigateFolder(path);
    setSearchOpen(false);
    setQuery("");
  }

  function handleFileResult(file: FileRow) {
    if (isPreviewable(file.mime_type)) setPreviewFile(file);
    else downloadFile(file);
    setSearchOpen(false);
    setQuery("");
  }

  const hasQuery = debounced.length >= 2;
  const hasResults = !!results && (results.folders.length > 0 || results.files.length > 0);

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 bg-white px-6 dark:bg-dark-surface">
      <img
        src={theme === "dark" ? "/logo-dark.png" : "/logo-claro.png"}
        alt="AvestaCloud"
        className="h-12 w-auto shrink-0"
      />

      <div ref={searchRef} className="relative flex flex-1 justify-center">
        <div className="w-full max-w-md">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-gray dark:text-white/60" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Buscar arquivos e pastas…"
              className="w-full rounded-full border border-black/0 bg-black/5 py-2 pl-9 pr-4 text-sm text-brand-black placeholder-brand-gray outline-none transition-colors duration-150 focus:bg-white dark:bg-white/10 dark:text-white dark:placeholder-white/50 dark:focus:bg-dark-canvas"
            />
          </div>

          {searchOpen && hasQuery && (
            <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-lg border border-brand-border bg-white py-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface">
              {isFetching && <p className="px-4 py-3 text-sm text-brand-gray">Buscando…</p>}

              {!isFetching && !hasResults && (
                <p className="px-4 py-3 text-sm text-brand-gray">Nenhum resultado para “{debounced}”.</p>
              )}

              {!isFetching && results && results.folders.length > 0 && (
                <div className="pb-1">
                  <p className="eyebrow px-4 pb-1 pt-2 text-brand-gray">Pastas</p>
                  {results.folders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => handleFolderResult(folder)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/40 dark:text-white dark:hover:bg-white/10"
                    >
                      <FolderIcon className="h-4 w-4 shrink-0 text-brand-primary" />
                      <span className="truncate">{folder.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {!isFetching && results && results.files.length > 0 && (
                <div>
                  <p className="eyebrow px-4 pb-1 pt-2 text-brand-gray">Arquivos</p>
                  {results.files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => handleFileResult(file)}
                      className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-brand-black transition-colors hover:bg-brand-pale/40 dark:text-white dark:hover:bg-white/10"
                    >
                      <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-5 w-5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                      <span className="mono-tag ml-auto shrink-0 text-[11px] text-brand-gray">
                        {formatBytes(file.size_bytes)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
        title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-brand-gray transition-colors hover:bg-black/5 hover:text-brand-black dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
      >
        {theme === "dark" ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
      </button>

      <div ref={profileRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          className="mono-tag rounded-md px-2 py-1.5 text-sm text-brand-black/80 transition-colors hover:bg-black/5 hover:text-brand-black dark:text-white/90 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {userEmail}
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-lg border border-brand-border bg-white p-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary text-base font-bold text-white">
                {getInitials(profile?.display_name, userEmail)}
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold text-brand-black dark:text-white">
                  {profile?.display_name || userEmail}
                </span>
                <span className="mono-tag truncate text-[11px] text-brand-gray">{userEmail}</span>
              </div>
            </div>

            {profile && (
              <span className="eyebrow mt-4 inline-block rounded-full border border-brand-border px-2.5 py-1 text-brand-primary dark:border-white/15">
                {ROLE_LABEL[profile.role]}
              </span>
            )}

            <div className="mt-4 border-t border-brand-border pt-4 dark:border-white/10">
              <button
                type="button"
                onClick={async () => {
                  await logEvent("logout", "sessao", userEmail);
                  supabase.auth.signOut();
                }}
                className="btn-ghost w-full py-2 text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </header>
  );
}
