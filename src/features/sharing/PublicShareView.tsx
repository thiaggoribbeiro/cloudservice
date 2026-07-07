import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fileIconFor, formatBytes, isPreviewable } from "../../lib/format";
import { SIGNED_URL_TTL_SECONDS } from "../../lib/constants";
import {
  resolveShareLink,
  listPublicFolderFiles,
  getSignedUrlForPath,
  downloadPublicFile,
} from "./publicShareApi";

function FilePreview({
  storagePath,
  name,
  mimeType,
}: {
  storagePath: string;
  name: string;
  mimeType: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getSignedUrlForPath(storagePath, SIGNED_URL_TTL_SECONDS).then(setUrl);
  }, [storagePath]);

  if (!isPreviewable(mimeType)) return null;
  if (!url) return <p className="text-brand-gray">Carregando pre-visualizacao...</p>;

  if (mimeType?.startsWith("image/")) {
    return (
      <img
        src={url}
        alt={name}
        className="max-h-[45vh] max-w-full rounded-lg object-contain shadow-sm"
      />
    );
  }
  return <embed src={url} type="application/pdf" className="h-[45vh] w-full rounded-lg" />;
}

export function PublicShareView({ token }: { token: string }) {
  const { data: link, isLoading, error } = useQuery({
    queryKey: ["publicShareLink", token],
    queryFn: () => resolveShareLink(token),
    retry: false,
  });

  const { data: folderFiles = [] } = useQuery({
    queryKey: ["publicFolderFiles", token],
    queryFn: () => listPublicFolderFiles(token),
    enabled: link?.kind === "folder",
  });

  return (
    <div className="bg-grain relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-6">
      <div className="wash-pale pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-70 blur-3xl" />
      <div className="wash-secondary pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="stagger-1 relative rounded-2xl border border-brand-border bg-white p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
          <div className="stagger-0 flex justify-center pb-8">
            <img src="/logo-orange.png" alt="AvestaCloud" className="h-20 w-auto" />
          </div>

          <p className="eyebrow text-brand-primary">AvestaCloud · link publico</p>

          {isLoading && <p className="mt-4 text-brand-gray">Carregando...</p>}

          {!isLoading && (error || !link) && (
            <>
              <h1 className="mt-1 text-2xl leading-none text-brand-black">Link invalido</h1>
              <p className="mt-2 text-sm text-brand-gray">
                Este link expirou ou foi revogado pelo dono do arquivo.
              </p>
            </>
          )}

          {!isLoading && link?.kind === "file" && link.storage_path && (
            <div className="mt-4 flex flex-col items-center gap-4 text-center">
              <span className="tile-icon">{fileIconFor(link.mime_type)}</span>
              <div>
                <p className="text-xl font-bold leading-none text-brand-black">{link.name}</p>
                {link.size_bytes !== null && (
                  <p className="mono-tag mt-1.5 text-xs text-brand-gray">{formatBytes(link.size_bytes)}</p>
                )}
              </div>
              <FilePreview storagePath={link.storage_path} name={link.name} mimeType={link.mime_type} />
              <button
                type="button"
                onClick={() => downloadPublicFile(link.storage_path!, link.name)}
                className="btn-primary w-full py-3"
              >
                Baixar
              </button>
            </div>
          )}

          {!isLoading && link?.kind === "folder" && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="flex items-center gap-2 text-xl font-bold leading-none text-brand-black">
                <span className="tile-icon h-9 w-9 text-lg text-brand-primary">📁</span>
                {link.name}
              </p>
              {folderFiles.length === 0 && (
                <p className="text-sm text-brand-gray">Esta pasta esta vazia.</p>
              )}
              {folderFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-brand-border px-3.5 py-2.5 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span>{fileIconFor(file.mime_type)}</span>
                    <span className="truncate">{file.name}</span>
                    <span className="mono-tag shrink-0 text-[11px] text-brand-gray">
                      {formatBytes(file.size_bytes)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => downloadPublicFile(file.storage_path, file.name)}
                    className="shrink-0 text-brand-primary hover:underline"
                  >
                    Baixar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
