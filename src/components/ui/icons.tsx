import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h4l2 2.2h7A1.5 1.5 0 0 1 20 8.7V17.5A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8.5" cy="8" r="2.6" />
      <path d="M3.8 18.5c.6-2.8 2.4-4.3 4.7-4.3s4.1 1.5 4.7 4.3" />
      <circle cx="17" cy="7.2" r="2.1" />
      <path d="M14.8 12.3c1.7.3 2.9 1.5 3.6 3.6" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.2 14.3 9l5.2.7-3.8 3.7.9 5.2L12 16.1l-4.6 2.5.9-5.2-3.8-3.7L9.7 9z" />
    </svg>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 7h14" />
      <path d="M9.5 7V5.2A1.2 1.2 0 0 1 10.7 4h2.6a1.2 1.2 0 0 1 1.2 1.2V7" />
      <path d="M6.5 7 7.2 19a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4L17.5 7" />
      <path d="M10.2 11v5.3M13.8 11v5.3" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function UploadFileIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V5.8" />
      <path d="M8.2 9.5 12 5.8l3.8 3.7" />
      <path d="M5 16v2.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  );
}

export function UploadFolderIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.3A1.3 1.3 0 0 1 5.3 6h3.6l1.8 2h7A1.3 1.3 0 0 1 19 9.3v8.2a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 17.5z" />
      <path d="M12 16v-4.2M10.1 13.5 12 11.6l1.9 1.9" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c.7-3.4 2.9-5.2 5.5-5.2s4.8 1.8 5.5 5.2" />
      <path d="M15.2 8.2a2.6 2.6 0 1 1 2.2 4" />
      <path d="M16 13.8c2 .4 3.4 1.9 4 5.2" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m20 20-4.6-4.6" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.8 6.8 0 0 0 9.5 9.5z" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 6.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <path d="m4.2 7 7.8 6.3L19.8 7" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 11V8.2a5.5 5.5 0 0 1 11 0V11" />
      <path d="M5.8 11h12.4a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5.8a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.8 12s3.2-5.8 9.2-5.8 9.2 5.8 9.2 5.8-3.2 5.8-9.2 5.8S2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m3.5 3.5 17 17" />
      <path d="M9.6 5.7A8.6 8.6 0 0 1 12 5.3c6 0 9.2 6.7 9.2 6.7a16 16 0 0 1-2.7 3.7" />
      <path d="M6.2 7.5A16.5 16.5 0 0 0 2.8 12s3.2 6.7 9.2 6.7a8.5 8.5 0 0 0 3.8-.9" />
      <path d="M9.8 9.8a3 3 0 0 0 4.4 4.4" />
    </svg>
  );
}
// A stored-away archive crate - deliberately distinct from FolderIcon, since
// a repositorio is a different kind of space (shared, quota-managed) rather
// than just another folder.
export function RepositoryIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8.2A1.2 1.2 0 0 1 5.2 7h13.6A1.2 1.2 0 0 1 20 8.2v2.3H4z" />
      <path d="M4.6 10.5h14.8v7.3a1.2 1.2 0 0 1-1.2 1.2H5.8a1.2 1.2 0 0 1-1.2-1.2z" />
      <path d="M10 13.6h4" />
    </svg>
  );
}
