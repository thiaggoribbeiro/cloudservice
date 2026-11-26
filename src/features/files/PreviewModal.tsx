import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { getPreviewUrl, downloadFile } from "./fileApi";
import { SIGNED_URL_TTL_SECONDS } from "../../lib/constants";
import { DownloadIcon } from "../../components/ui/icons";
import type { FileRow } from "../../types/domain";

export function PreviewModal({
  file,
  onClose,
  siblings,
  onNavigate,
}: {
  file: FileRow;
  onClose: () => void;
  // Optional: the other previewable files of the folder, in on-screen
  // order, to step through them with the arrows / ← → keys.
  siblings?: FileRow[];
  onNavigate?: (file: FileRow) => void;
}) {
  // Keyed by file id, so stepping to the next file never shows the
  // previous file's URL or error while the new one loads.
  const [loaded, setLoaded] = useState<{ fileId: string; url: string | null; error: boolean } | null>(null);
  const url = loaded?.fileId === file.id ? loaded.url : null;
  const error = loaded?.fileId === file.id ? loaded.error : false;

  useEffect(() => {
    let cancelled = false;
    getPreviewUrl(file, SIGNED_URL_TTL_SECONDS)
      .then((signedUrl) => {
        if (!cancelled) setLoaded({ fileId: file.id, url: signedUrl, error: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ fileId: file.id, url: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const index = siblings ? siblings.findIndex((sibling) => sibling.id === file.id) : -1;
  const canNavigate = !!onNavigate && !!siblings && siblings.length > 1 && index >= 0;
  const previous = canNavigate && index > 0 ? siblings![index - 1] : null;
  const next = canNavigate && index < siblings!.length - 1 ? siblings![index + 1] : null;

  useEffect(() => {
    if (!canNavigate) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft" && previous) onNavigate!(previous);
      if (event.key === "ArrowRight" && next) onNavigate!(next);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [canNavigate, previous, next, onNavigate]);

  const isImage = file.mime_type?.startsWith("image/");
  const isPdf = file.mime_type === "application/pdf";

  const arrowClass =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-light-outline-variant bg-light-surface-container-lowest/90 text-light-on-surface shadow-lg backdrop-blur-sm transition-colors duration-state-change hover:bg-light-surface-container-lowest disabled:pointer-events-none disabled:opacity-0";

  return (
    <Modal title={file.name} onClose={onClose} size="large">
      <div className="relative flex h-[80vh] min-h-[200px] items-center justify-center overflow-auto rounded-xl bg-light-surface-container-low">
        {error && (
          <p role="alert" className="font-body text-body-sm text-light-error">
            Não foi possível carregar a pré-visualização.
          </p>
        )}
        {!error && !url && <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>}
        {!error && url && isImage && (
          <img key={url} src={url} alt={file.name} className="animate-fade max-h-full max-w-full object-contain" />
        )}
        {!error && url && isPdf && <embed src={url} type="application/pdf" className="h-full w-full" />}
        {!error && url && !isImage && !isPdf && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-body text-body-md text-light-on-surface-variant">
              Pré-visualização não disponível para este tipo de arquivo.
            </p>
            <button type="button" onClick={() => downloadFile(file)} className="btn-primary">
              Baixar
            </button>
          </div>
        )}

        {canNavigate && (
          <>
            <button
              type="button"
              onClick={() => previous && onNavigate!(previous)}
              disabled={!previous}
              aria-label="Arquivo anterior"
              className={`${arrowClass} left-3`}
            >
              <span className="ms-icon text-[24px]" aria-hidden="true">
                chevron_left
              </span>
            </button>
            <button
              type="button"
              onClick={() => next && onNavigate!(next)}
              disabled={!next}
              aria-label="Próximo arquivo"
              className={`${arrowClass} right-3`}
            >
              <span className="ms-icon text-[24px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="font-body text-body-sm tabular-nums text-light-on-surface-variant">
          {canNavigate ? `${index + 1} de ${siblings!.length}` : ""}
        </span>
        <button type="button" onClick={() => downloadFile(file)} className="btn-ghost">
          <DownloadIcon className="h-[18px] w-[18px]" />
          Baixar
        </button>
      </div>
    </Modal>
  );
}
