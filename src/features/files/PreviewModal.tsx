import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { getPreviewUrl, downloadFile } from "./fileApi";
import { SIGNED_URL_TTL_SECONDS } from "../../lib/constants";
import type { FileRow } from "../../types/domain";

export function PreviewModal({ file, onClose }: { file: FileRow; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPreviewUrl(file, SIGNED_URL_TTL_SECONDS)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const isImage = file.mime_type?.startsWith("image/");
  const isPdf = file.mime_type === "application/pdf";

  return (
    <Modal title={file.name} onClose={onClose} size="large">
      <div className="flex h-[85vh] min-h-[200px] items-center justify-center overflow-auto rounded-xl bg-light-surface-container-low">
        {error && <p role="alert" className="font-body text-body-sm text-light-error">Não foi possível carregar a pré-visualização.</p>}
        {!error && !url && <p className="font-body text-body-sm text-light-on-surface-variant">Carregando…</p>}
        {!error && url && isImage && (
          <img src={url} alt={file.name} className="max-h-full max-w-full object-contain" />
        )}
        {!error && url && isPdf && (
          <embed src={url} type="application/pdf" className="h-full w-full" />
        )}
        {!error && url && !isImage && !isPdf && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="font-body text-body-md text-light-on-surface-variant">Pré-visualização não disponível para este tipo de arquivo.</p>
            <button type="button" onClick={() => downloadFile(file)} className="btn-primary">
              Baixar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
