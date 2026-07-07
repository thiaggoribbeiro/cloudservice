import { useQuery } from "@tanstack/react-query";
import { listFolders } from "./folderApi";

export function useFolderChildren(parentId: string | null, ownerId?: string, enabled = true) {
  return useQuery({
    queryKey: ["folderChildren", parentId],
    queryFn: () => listFolders(parentId, ownerId),
    enabled,
  });
}
