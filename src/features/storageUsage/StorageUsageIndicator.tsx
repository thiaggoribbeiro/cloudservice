import { useQuery } from "@tanstack/react-query";
import { useStorageUsage } from "./useStorageUsage";
import { formatBytes } from "../../lib/format";
import { APP_VERSION } from "../../lib/constants";
import { getRepositoryUsage } from "../repositories/repositoryApi";
import { CloudIcon } from "../../components/ui/icons";

export function StorageUsageIndicator({
  userId,
  repositoryId,
}: {
  userId: string | undefined;
  repositoryId?: string | null;
}) {
  const personalUsage = useStorageUsage(repositoryId ? undefined : userId);
  const repositoryUsage = useQuery({
    queryKey: ["repositoryUsage", repositoryId],
    queryFn: () => getRepositoryUsage(repositoryId!),
    enabled: !!repositoryId,
  });

  const data = repositoryId ? repositoryUsage.data : personalUsage.data;
  const percent = data?.quota_bytes ? Math.min(100, (data.used_bytes / data.quota_bytes) * 100) : 0;
  // Over 90% of the quota is a real warning, not decoration - use the
  // "a vencer" status color for it, never the brand accent.
  const nearlyFull = percent >= 90;

  return (
    <div className="border-t border-light-outline-variant px-4 pb-4 pt-4">
      {data && (
        <div className="rounded-xl bg-light-surface-container-low p-3">
          <div className="mb-2 flex items-center gap-2">
            <CloudIcon className="h-[18px] w-[18px] text-light-on-surface-variant" />
            <span className="font-label text-label-md text-light-on-surface">
              {repositoryId ? "Armazenamento do repositório" : "Armazenamento"}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-light-surface-container-high"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            aria-label="Uso do armazenamento"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${nearlyFull ? "bg-status-avencer" : "bg-light-primary"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 font-body text-body-sm tabular-nums text-light-on-surface-variant">
            {formatBytes(data.used_bytes)} de {formatBytes(data.quota_bytes)}
          </p>
        </div>
      )}
      <p className="mt-3 px-1 font-body text-[11px] leading-4 text-light-outline">Versão {APP_VERSION}</p>
    </div>
  );
}
