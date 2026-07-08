import { useState, type DragEvent, type ReactNode } from "react";

export function UploadDropzone({
  onUpload,
  children,
}: {
  onUpload: (files: FileList) => void;
  children: ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 overflow-y-auto"
    >
      {children}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/85 backdrop-blur-sm dark:bg-black/85">
          <div className="rounded-2xl border-2 border-dashed border-brand-primary bg-brand-pale/50 px-10 py-8 text-center dark:bg-white/5">
            <p className="text-2xl font-bold text-brand-primary">Solte os arquivos aqui</p>
            <p className="eyebrow mt-1 text-brand-primary/70">Envio para a pasta atual</p>
          </div>
        </div>
      )}
    </div>
  );
}
