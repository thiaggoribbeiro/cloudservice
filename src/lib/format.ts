export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

export type FileCategory =
  | "pdf"
  | "spreadsheet"
  | "document"
  | "presentation"
  | "image"
  | "video"
  | "audio"
  | "archive"
  | "code"
  | "other";

// Extension is the primary signal for the file-type icon - it's what the
// user actually typed/sees, and it's available even when the browser sends
// a generic or missing mime type (common for less common extensions).
const EXTENSION_CATEGORY: Record<string, FileCategory> = {
  pdf: "pdf",
  xlsx: "spreadsheet",
  xls: "spreadsheet",
  csv: "spreadsheet",
  ods: "spreadsheet",
  doc: "document",
  docx: "document",
  txt: "document",
  rtf: "document",
  odt: "document",
  md: "document",
  ppt: "presentation",
  pptx: "presentation",
  key: "presentation",
  odp: "presentation",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  bmp: "image",
  heic: "image",
  mp4: "video",
  mov: "video",
  avi: "video",
  mkv: "video",
  webm: "video",
  mp3: "audio",
  wav: "audio",
  flac: "audio",
  aac: "audio",
  ogg: "audio",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  js: "code",
  ts: "code",
  tsx: "code",
  jsx: "code",
  json: "code",
  html: "code",
  css: "code",
  py: "code",
  java: "code",
  php: "code",
};

export function fileExtensionOf(name: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(name);
  return match ? match[1].toLowerCase() : "";
}

// Extension wins when recognized; mime type is only a fallback for files
// whose extension we don't know about.
export function fileCategoryOf(name: string, mimeType: string | null): FileCategory {
  const ext = fileExtensionOf(name);
  if (ext && EXTENSION_CATEGORY[ext]) return EXTENSION_CATEGORY[ext];

  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("spreadsheet") || mimeType === "application/vnd.ms-excel" || mimeType === "text/csv") {
      return "spreadsheet";
    }
    if (mimeType.includes("presentation")) return "presentation";
    if (mimeType.includes("zip") || mimeType.includes("compressed")) return "archive";
    if (mimeType.startsWith("text/") || mimeType.includes("wordprocessing") || mimeType === "application/msword") {
      return "document";
    }
  }
  return "other";
}

export type FileKindFilter = "all" | "image" | "document" | "spreadsheet" | "pdf";

export const FILE_KIND_LABEL: Record<FileKindFilter, string> = {
  all: "Todas",
  image: "Imagens",
  document: "Documentos",
  spreadsheet: "Planilhas",
  pdf: "PDF",
};

export function fileKindOf(mimeType: string | null): Exclude<FileKindFilter, "all"> | "other" {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("wordprocessing") ||
    mimeType === "application/msword"
  ) {
    return "document";
  }
  return "other";
}

// Coarse "time since" for recency lists (last accessed, last edited) - not a
// precision timestamp, so it steps down in granularity the further back it goes.
export function formatRelativeTime(iso: string): string {
  const elapsedMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(elapsedMs / 60000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}
