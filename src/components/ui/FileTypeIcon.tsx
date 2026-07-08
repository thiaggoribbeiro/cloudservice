import { fileCategoryOf, fileExtensionOf, type FileCategory } from "../../lib/format";

// Semantic, not brand, colors - these borrow the associations people already
// have from other file-storage apps (PDF red, spreadsheet green, etc.), which
// makes the file type recognizable at a glance rather than just decorative.
const CATEGORY_COLOR: Record<FileCategory, string> = {
  pdf: "#E5484D",
  spreadsheet: "#15A34A",
  document: "#3B82F6",
  presentation: "#F0913A",
  image: "#C026D3",
  video: "#6366F1",
  audio: "#0D9488",
  archive: "#92653D",
  code: "#64748B",
  other: "#9CA3AF",
};

export function FileTypeIcon({
  name,
  mimeType,
  className = "h-9 w-9",
}: {
  name: string;
  mimeType: string | null;
  className?: string;
}) {
  const category = fileCategoryOf(name, mimeType);
  const color = CATEGORY_COLOR[category];
  const ext = fileExtensionOf(name).slice(0, 4).toUpperCase();

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <path d="M9 3h14l8 8v24a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill={color} />
      <path d="M23 3v6a2 2 0 0 0 2 2h6Z" fill="black" fillOpacity={0.18} />
      {ext && (
        <text
          x="20"
          y="27.5"
          textAnchor="middle"
          fontSize={ext.length > 3 ? "7" : "8.5"}
          fontWeight="700"
          fill="#ffffff"
          fontFamily="Archivo, sans-serif"
        >
          {ext}
        </text>
      )}
    </svg>
  );
}
