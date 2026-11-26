import type { CSSProperties } from "react";

// Every glyph comes from Material Symbols Outlined (Design System Aptus §7),
// rendered through the project's own .ms-icon class. The size is read from
// the same h-* class callers already pass (h-4, h-[18px]...) so a font-based
// icon lines up exactly where the old SVG one did.
type IconProps = {
  className?: string;
  filled?: boolean;
  style?: CSSProperties;
};

const DEFAULT_SIZE = 20;

function sizeFromClassName(className: string | undefined): number {
  if (!className) return DEFAULT_SIZE;
  const px = className.match(/(?:^|\s)h-\[(\d+(?:\.\d+)?)px\]/);
  if (px) return Number(px[1]);
  const scale = className.match(/(?:^|\s)h-(\d+(?:\.\d+)?)(?=\s|$)/);
  if (scale) return Number(scale[1]) * 4;
  return DEFAULT_SIZE;
}

function makeIcon(glyph: string) {
  return function Icon({ className, filled, style }: IconProps) {
    const size = sizeFromClassName(className);
    return (
      <span
        aria-hidden="true"
        className={`ms-icon ${filled ? "material-symbols-filled" : ""} ${className ?? ""}`}
        style={{ fontSize: size, width: size, height: size, ...style }}
      >
        {glyph}
      </span>
    );
  };
}

export const HomeIcon = makeIcon("home");
export const FolderIcon = makeIcon("folder_open");
export const ShareIcon = makeIcon("folder_shared");
export const StarIcon = makeIcon("star");
export const TrashIcon = makeIcon("delete");
export const PlusIcon = makeIcon("add");
export const UploadFileIcon = makeIcon("upload_file");
export const UploadFolderIcon = makeIcon("drive_folder_upload");
export const ChevronDownIcon = makeIcon("expand_more");
export const ChevronRightIcon = makeIcon("chevron_right");
export const UsersIcon = makeIcon("supervisor_account");
export const SearchIcon = makeIcon("search");
export const SunIcon = makeIcon("light_mode");
export const MoonIcon = makeIcon("dark_mode");
export const MailIcon = makeIcon("mail");
export const LockIcon = makeIcon("lock");
export const UnlockIcon = makeIcon("lock_open");
export const DownloadIcon = makeIcon("download");
export const EyeIcon = makeIcon("visibility");
export const EyeOffIcon = makeIcon("visibility_off");
// A stored-away archive box - deliberately distinct from FolderIcon, since a
// repositorio is a different kind of space (shared, quota-managed).
export const RepositoryIcon = makeIcon("inventory_2");
export const EventLogIcon = makeIcon("receipt_long");
export const LocateIcon = makeIcon("location_on");
export const MenuIcon = makeIcon("menu");
export const CloseIcon = makeIcon("close");
export const MoreIcon = makeIcon("more_vert");
export const LogoutIcon = makeIcon("logout");
export const CloudIcon = makeIcon("cloud");
export const InboxIcon = makeIcon("inbox");
export const UploadIcon = makeIcon("upload");
export const CheckCircleIcon = makeIcon("check_circle");
export const ErrorIcon = makeIcon("error");

// The classic solid manila folder used for rows in a file/folder list - a
// recognizable, fixed-yellow glyph (not a monochrome symbol like FolderIcon
// above, which is tuned for small nav/menu contexts).
export function FolderTileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <path
        d="M5 9.5A1.5 1.5 0 0 1 6.5 8h8.6a1.8 1.8 0 0 1 1.3.55L18.8 11H33.5A1.5 1.5 0 0 1 35 12.5v17A1.5 1.5 0 0 1 33.5 31h-27A1.5 1.5 0 0 1 5 29.5Z"
        fill="#FBBF24"
      />
      <path
        d="M5 14.5A1.5 1.5 0 0 1 6.5 13h27A1.5 1.5 0 0 1 35 14.5v15A1.5 1.5 0 0 1 33.5 31h-27A1.5 1.5 0 0 1 5 29.5Z"
        fill="#F59E0B"
      />
    </svg>
  );
}
