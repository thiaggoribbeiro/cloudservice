import { useQuery } from "@tanstack/react-query";
import { listFolders } from "./folderApi";
import { listFiles } from "../files/fileApi";

export function useFolderContents(folderId: string | null, ownerId?: string) {
  const foldersQuery = useQuery({
    queryKey: ["folderChildren", folderId],
    queryFn: () => listFolders(folderId, ownerId),
  });
  const filesQuery = useQuery({
    queryKey: ["files", folderId],
    queryFn: () => listFiles(folderId),
  });

  return {
    folders: foldersQuery.data ?? [],
    files: filesQuery.data ?? [],
    isLoading: foldersQuery.isLoading || filesQuery.isLoading,
  };
}
