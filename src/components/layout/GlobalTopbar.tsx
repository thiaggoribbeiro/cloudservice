import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";
import { ROLE_LABEL } from "../../lib/roleLabels";
import { formatBytes, isPreviewable } from "../../lib/format";
import { getInitials } from "../../lib/initials";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { searchFilesAndFolders } from "../../features/search/searchApi";
import { getFolderPath } from "../../features/folders/folderApi";
import { downloadFile } from "../../features/files/fileApi";
import { PreviewModal } from "../../features/files/PreviewModal";
import { useTheme } from "../../lib/useTheme";
import { SearchIcon, FolderIcon, SunIcon, MoonIcon, MenuIcon, ChevronDownIcon, LogoutIcon } from "../ui/icons";
import { logEvent } from "../../features/eventLog/eventLogApi";
import type { FileRow, Folder, Profile } from "../../types/domain";
import * as avestaId from "../../lib/avestaId";

const AVESTAID_ENABLED = import.meta.env.VITE_AVESTAID_ENABLED === "true";

export function GlobalTopbar({
  userEmail,
  profile,
  onNavigateFolder,
  onGoHome,
  onOpenNav,
}: {
  userEmail: string | undefined;
  profile: Profile | null;
  onNavigateFolder: (path: Folder[]) => void;
  onGoHome: () => void;
  onOpenNav: () => void;
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
    const path = await getFolderPath(folder.id);
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
  const displayName = profile?.display_name || userEmail;
  const initials = getInitials(profile?.display_name, userEmail);

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-gutter-sm border-b border-light-outline-variant bg-light-surface-container-lowest px-4 py-2.5 sm:flex-nowrap lg:gap-gutter-md lg:px-6">
      <button type="button" onClick={onOpenNav} className="btn-icon -ml-1 lg:hidden" aria-label="Abrir menu">
        <MenuIcon className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onGoHome}
        className="shrink-0 rounded-lg transition-opacity duration-state-change hover:opacity-80 lg:hidden"
        aria-label="Ir para a página inicial"
      >
        <img
          src={theme === "dark" ? "/logo-dark.png" : "/logo-claro.png"}
          alt="Cloud Service - Avesta"
          className="h-8 w-auto"
        />
      </button>

      <div ref={searchRef} className="relative order-3 w-full sm:order-none sm:w-auto sm:max-w-md sm:flex-1">
        <label htmlFor="global-search" className="sr-only">
          Buscar arquivos e pastas
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-light-outline" />
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSearchOpen(false);
            }}
            placeholder="Buscar arquivos e pastas…"
            className="field-input pl-9"
          />
        </div>

        {searchOpen && hasQuery && (
          <div className="menu-surface absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto py-1.5">
            {isFetching && (
              <p className="px-4 py-3 font-body text-body-sm text-light-on-surface-variant">Buscando…</p>
            )}

            {!isFetching && !hasResults && (
              <p className="px-4 py-3 font-body text-body-sm text-light-on-surface-variant">
                Nenhum resultado para “{debounced}”.
              </p>
            )}

            {!isFetching && results && results.folders.length > 0 && (
              <div className="pb-1">
                <p className="px-4 pb-1 pt-2 font-label text-label-sm text-light-on-surface-variant">Pastas</p>
                {results.folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => handleFolderResult(folder)}
                    className="menu-item px-4"
                  >
                    <FolderIcon className="h-[18px] w-[18px] text-light-primary" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
              </div>
            )}

            {!isFetching && results && results.files.length > 0 && (
              <div>
                <p className="px-4 pb-1 pt-2 font-label text-label-sm text-light-on-surface-variant">Arquivos</p>
                {results.files.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleFileResult(file)}
                    className="menu-item px-4"
                  >
                    <FileTypeIcon name={file.name} mimeType={file.mime_type} className="h-5 w-5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <span className="mono-tag ml-auto shrink-0 text-[12px] text-light-on-surface-variant">
                      {formatBytes(file.size_bytes)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-gutter-md">
        <button
          type="button"
          role="switch"
          aria-checked={theme === "dark"}
          onClick={toggleTheme}
          aria-label="Tema escuro"
          title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
          className="relative inline-flex h-[22px] w-10 shrink-0 items-center rounded-full border border-light-outline-variant bg-light-surface-container-high"
        >
          <SunIcon className="pointer-events-none absolute left-[4px] h-3 w-3 text-light-on-surface-variant" />
          <MoonIcon className="pointer-events-none absolute right-[4px] h-3 w-3 text-light-on-surface-variant" />
          <span
            className={`relative z-10 ml-[2px] h-4 w-4 rounded-full bg-light-surface-container-lowest shadow-sm transition-transform duration-surface-enter ease-surface-enter ${
              theme === "dark" ? "translate-x-[18px]" : "translate-x-0"
            }`}
          />
        </button>

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            aria-label="Conta"
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1 transition-colors duration-state-change hover:bg-light-surface-container md:pr-2"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-light-surface-container font-label text-label-md text-light-primary">
              {initials}
            </span>
            <span className="hidden max-w-[12rem] flex-col text-left md:flex">
              <span className="truncate font-label text-label-md text-light-on-surface">{displayName}</span>
              {profile && (
                <span className="truncate font-body text-[11px] leading-4 text-light-on-surface-variant">
                  {ROLE_LABEL[profile.role]}
                </span>
              )}
            </span>
            <ChevronDownIcon className="hidden h-[18px] w-[18px] text-light-on-surface-variant md:inline-flex" />
          </button>

          {profileOpen && (
            <div role="menu" className="menu-surface absolute right-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] py-0">
              <div className="flex items-center gap-3 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-light-surface-container font-headline text-headline-sm text-light-primary">
                  {initials}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-label text-label-lg text-light-on-surface">{displayName}</span>
                  <span className="truncate font-body text-body-sm text-light-on-surface-variant">{userEmail}</span>
                </div>
              </div>

              {profile && (
                <div className="px-4 pb-3">
                  <span className="badge badge-primary">{ROLE_LABEL[profile.role]}</span>
                </div>
              )}

              <div className="border-t border-light-outline-variant py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    await logEvent("logout", "sessao", userEmail);
                    if (AVESTAID_ENABLED) {
                      await avestaId.signOut();
                      window.location.href = "/"; // re-boot: AuthProvider will redirect to the AvestaID portal
                      return;
                    }
                    supabase.auth.signOut();
                  }}
                  className="menu-item px-4"
                >
                  <LogoutIcon className="h-[18px] w-[18px] text-light-on-surface-variant" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </header>
  );
}
