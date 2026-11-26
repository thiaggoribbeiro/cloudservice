import type { ReactNode } from "react";
import { InboxIcon } from "./icons";

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="card animate-fade flex flex-col items-center justify-center gap-2 p-10 text-center">
      <span className="mb-1 text-light-outline">{icon ?? <InboxIcon className="h-9 w-9" />}</span>
      <h3 className="font-title text-title-md text-light-on-surface">{title}</h3>
      <p className="max-w-sm font-body text-body-sm text-light-on-surface-variant">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
