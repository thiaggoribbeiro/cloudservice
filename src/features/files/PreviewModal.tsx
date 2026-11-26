import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { getPreviewUrl, downloadFile } from "./fileApi";
import { SIGNED_URL_TTL_SECONDS } from "../../lib/constants";
import { DownloadIcon } from "../../components/ui/icons";

// The browser's PDF viewer streams long documents in ranges as you scroll,
// so the signed URL must outlive a reading session, not just the first load.
const PDF_URL_TTL_SECONDS = 3600;

// Chrome/Edge/Firefox/Safari desktop expose a built-in viewer; most mobile
// browsers don't, and an <iframe> there renders blank or force-downloads.
const hasBuiltInPdfViewer = typeof navigator !== "undefined" && navigator.pdfViewerEnabled !== false;
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
  const isImage = file.mime_type?.startsWith("image/");
  const isPdf = file.mime_type === "application/pdf";

  // Keyed by file id, so stepping to the next file never shows the
  // previous file's URL or error while the new one loads.
  const [loaded, setLoaded] = useState<{ fileId: string; url: string | null; error: boolean } | null>(null);
  const url = loaded?.fileId === file.id ? loaded.url : null;
  const error = loaded?.fileId === file.id ? loaded.error : false;

  useEffect(() => {
    let cancelled = false;
    getPreviewUrl(file, isPdf ? PDF_URL_TTL_SECONDS : SIGNED_URL_TTL_SECONDS)
      .then((signedUrl) => {
        if (!cancelled) setLoaded({ fileId: file.id, url: signedUrl, error: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ fileId: file.id, url: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [file, isPdf]);

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

  // Fresh URL on click, so it still works after the viewer sat open a while.
  // The tab is opened synchronously (then pointed at the URL) so popup
  // blockers treat it as the direct result of the click.
  function openInNewTab() {
    const tab = window.open("", "_blank");
    getPreviewUrl(file, PDF_URL_TTL_SECONDS)
      .then((freshUrl) => {
        if (tab) tab.location.href = freshUrl;
        else window.location.assign(freshUrl);
      })
      .catch(() => tab?.close());
  }

  const arrowClass =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-light-outline-variant bg-light-surface-container-lowest/90 text-light-on-surface shadow-lg backdrop-blur-sm transition-colors duration-state-change hover:bg-light-surface-container-lowest disabled:pointer-events-none disabled:opacity-0";

  return (
    <Modal title={file.name} onClose={onClose} size="large">
      <div className={`relative flex min-h-[200px] items-center justify-center overflow-auto rounded-xl bg-light-surface-container-low h-[calc(100vh-14rem)]`}>
        {error && (
          <p role="alert" className="font-body text-body-sm text-light-error">
            Não foi possível carregar a pré-visualização.
          </p>
        )}
        {!error && !url && <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>}
        {!error && url && isImage && (
          <img key={url} src={url} alt={file.name} className="animate-fade max-h-full max-w-full object-contain" />
        )}
        {!error && url && isPdf && hasBuiltInPdfViewer && (
          <iframe
            key={url}
            src={`${url}#view=FitH`}
            title={`Documento: ${file.name}`}
            className="animate-fade h-full w-full rounded-xl border-0 bg-light-surface-container-lowest"
          />
        )}
        {!error && url && isPdf && !hasBuiltInPdfViewer && (
          <div className="flex max-w-sm flex-col items-center gap-3 px-6 py-8 text-center">
            <span className="ms-icon text-[36px] text-light-outline" aria-hidden="true">
              picture_as_pdf
            </span>
            <p className="font-body text-body-md text-light-on-surface-variant">
              Este navegador não mostra PDF dentro da página. Abra o documento numa nova aba ou baixe.
            </p>
            <div className="flex gap-gutter-sm">
              <button type="button" onClick={openInNewTab} className="btn-primary">
                Abrir documento
              </button>
              <button type="button" onClick={() => downloadFile(file)} className="btn-ghost">
                Baixar
              </button>
            </div>
          </div>
        )}
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

        {canNavigate && !isPdf && (
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
        <div className="flex items-center gap-1">
          {canNavigate && isPdf && (
            <button
              type="button"
              onClick={() => previous && onNavigate!(previous)}
              disabled={!previous}
              aria-label="Arquivo anterior"
              className="btn-icon disabled:opacity-40"
            >
              <span className="ms-icon text-[22px]" aria-hidden="true">
                chevron_left
              </span>
            </button>
          )}
          <span className="font-body text-body-sm tabular-nums text-light-on-surface-variant">
            {canNavigate ? `${index + 1} de ${siblings!.length}` : ""}
          </span>
          {canNavigate && isPdf && (
            <button
              type="button"
              onClick={() => next && onNavigate!(next)}
              disabled={!next}
              aria-label="Próximo arquivo"
              className="btn-icon disabled:opacity-40"
            >
              <span className="ms-icon text-[22px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          )}
        </div>
        <div className="flex gap-gutter-sm">
          {isPdf && (
            <button type="button" onClick={openInNewTab} className="btn-ghost">
              <span className="ms-icon text-[18px]" aria-hidden="true">
                open_in_new
              </span>
              Abrir em nova aba
            </button>
          )}
          <button type="button" onClick={() => downloadFile(file)} className="btn-ghost">
            <DownloadIcon className="h-[18px] w-[18px]" />
            Baixar
          </button>
        </div>
      </div>
    </Modal>
  );
}
