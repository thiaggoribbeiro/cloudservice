import { useQuery } from "@tanstack/react-query";
import { listFavoriteIds } from "./favoritesApi";

export function useFavoriteIds(userId: string) {
  return useQuery({
    queryKey: ["favoriteIds", userId],
    queryFn: () => listFavoriteIds(userId),
  });
}
