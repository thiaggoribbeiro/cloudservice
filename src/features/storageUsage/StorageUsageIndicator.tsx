import { useQuery } from "@tanstack/react-query";
import { useStorageUsage } from "./useStorageUsage";
import { formatBytes } from "../../lib/format";
import { APP_VERSION } from "../../lib/constants";
import { getRepositoryUsage } from "../repositories/repositoryApi";

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

  return (
    <div className="px-5 pb-5 pt-3">
      {data && (
        <>
          <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
            <div
              className="h-full rounded-full bg-brand-primary transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mono-tag mt-2 text-[11px] text-brand-black/55 dark:text-white/55">
            {formatBytes(data.used_bytes)} / {formatBytes(data.quota_bytes)}
          </p>
        </>
      )}
      <p className="mono-tag mt-1 text-[10px] uppercase tracking-widest text-brand-black/35 dark:text-white/35">
        Versão {APP_VERSION}
      </p>
    </div>
  );
}
