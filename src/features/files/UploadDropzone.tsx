import { useState, type DragEvent, type ReactNode } from "react";
import { UploadIcon } from "../../components/ui/icons";

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
        <div className="animate-fade pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-light-background/85 p-6 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-light-primary bg-light-surface-container-lowest px-10 py-8 text-center shadow-xl">
            <UploadIcon className="animate-pop h-9 w-9 text-light-primary" />
            <p className="font-headline text-headline-sm text-light-on-surface">Solte os arquivos aqui</p>
            <p className="font-body text-body-sm text-light-on-surface-variant">Eles vão para a pasta atual</p>
          </div>
        </div>
      )}
    </div>
  );
}
