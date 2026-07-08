import { useStorageUsage } from "./useStorageUsage";
import { formatBytes } from "../../lib/format";

export function StorageUsageIndicator({ userId }: { userId: string | undefined }) {
  const { data } = useStorageUsage(userId);

  if (!data) return null;

  const percent = data.quota_bytes ? Math.min(100, (data.used_bytes / data.quota_bytes) * 100) : 0;

  return (
    <div className="px-5 pb-5 pt-3">
      <div className="h-1 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
        <div
          className="h-full rounded-full bg-brand-primary transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mono-tag mt-2 text-[11px] text-brand-black/55 dark:text-white/55">
        {formatBytes(data.used_bytes)} / {formatBytes(data.quota_bytes)}
      </p>
    </div>
  );
}
