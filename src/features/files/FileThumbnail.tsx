import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileTypeIcon } from "../../components/ui/FileTypeIcon";
import { getThumbnailUrl, THUMBNAIL_TTL_SECONDS } from "./fileApi";
import { isImageFile } from "../../lib/format";
import type { FileRow } from "../../types/domain";

// Image preview for the icon/photo views. Loads only once the tile is near
// the viewport, asks Storage for a resized copy first and falls back to the
// original when image transformations aren't available (or the format
// can't be resized), and finally to the file-type icon if nothing renders.
export function FileThumbnail({
  file,
  width,
  iconClassName = "h-12 w-12",
  className = "",
}: {
  file: FileRow;
  width: number;
  iconClassName?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<"resized" | "original" | "failed">("resized");
  const [loaded, setLoaded] = useState(false);
  const image = isImageFile(file);

  useEffect(() => {
    if (!image || visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [image, visible]);

  const resizeWidth = stage === "resized" ? width : undefined;
  const { data: url } = useQuery({
    queryKey: ["thumbnail", file.id, file.updated_at, resizeWidth ?? "original"],
    // If even signing the resized URL fails, go straight for the original.
    queryFn: () => getThumbnailUrl(file, resizeWidth).catch(() => getThumbnailUrl(file)),
    enabled: image && visible && stage !== "failed",
    staleTime: (THUMBNAIL_TTL_SECONDS - 300) * 1000,
    gcTime: THUMBNAIL_TTL_SECONDS * 1000,
    retry: false,
  });

  const showIcon = !image || stage === "failed";

  return (
    <div ref={ref} className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      {showIcon ? (
        <FileTypeIcon name={file.name} mimeType={file.mime_type} className={iconClassName} />
      ) : (
        <>
          {!loaded && <div className="absolute inset-0 animate-pulse bg-light-surface-container-high" aria-hidden="true" />}
          {url && (
            <img
              key={url}
              src={url}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => {
                setLoaded(false);
                setStage((current) => (current === "resized" ? "original" : "failed"));
              }}
              className={`h-full w-full object-cover transition-opacity duration-surface-enter ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          )}
        </>
      )}
    </div>
  );
}
