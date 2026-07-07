import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabaseClient";

export function useStorageUsage(userId: string | undefined) {
  return useQuery({
    queryKey: ["storageUsage", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_storage_usage", { p_user: userId! });
      if (error) throw error;
      return data[0];
    },
    enabled: !!userId,
  });
}
