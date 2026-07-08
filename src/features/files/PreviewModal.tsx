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
    <Modal title={file.name} onClose={onClose}>
      <div className="flex max-h-[70vh] min-h-[200px] items-center justify-center overflow-auto rounded-lg bg-brand-pale/25 dark:bg-white/5">
        {error && <p className="text-sm text-brand-primary">Nao foi possivel carregar a pre-visualizacao.</p>}
        {!error && !url && <p className="text-brand-gray">Carregando...</p>}
        {!error && url && isImage && (
          <img src={url} alt={file.name} className="max-h-[65vh] max-w-full object-contain" />
        )}
        {!error && url && isPdf && (
          <embed src={url} type="application/pdf" className="h-[65vh] w-full" />
        )}
        {!error && url && !isImage && !isPdf && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-brand-gray">Pre-visualizacao nao disponivel para este tipo de arquivo.</p>
            <button type="button" onClick={() => downloadFile(file)} className="btn-primary">
              Baixar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
