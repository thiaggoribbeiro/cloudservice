import { supabase } from "../../lib/supabaseClient";
import type { Json } from "../../types/database.types";
import type { EventLog } from "../../types/domain";

const PAGE_SIZE = 40;

// Fire-and-forget: a failed audit write must never block the real action the
// user is performing (upload, delete, etc.), so errors are only logged.
export async function logEvent(
  action: string,
  targetType: string,
  targetName?: string | null,
  targetId?: string | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  const { error } = await supabase.rpc("log_event", {
    p_action: action,
    p_target_type: targetType,
    p_target_name: targetName ?? undefined,
    p_target_id: targetId ?? undefined,
    p_metadata: (metadata as Json) ?? undefined,
  });
  if (error) console.error("Falha ao registrar evento:", error);
}

export async function listEventLogs({
  offset = 0,
  actionCategory,
  search,
}: {
  offset?: number;
  actionCategory?: string;
  search?: string;
}): Promise<{ rows: EventLog[]; hasMore: boolean }> {
  let query = supabase
    .from("event_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (actionCategory) query = query.eq("target_type", actionCategory);
  if (search) query = query.ilike("user_email", `%${search}%`);

  const { data, error } = await query;
  if (error) throw error;

  return { rows: data, hasMore: data.length === PAGE_SIZE };
}

export { PAGE_SIZE as EVENT_LOG_PAGE_SIZE };
