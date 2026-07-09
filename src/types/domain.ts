import type { Enums, Tables } from "./database.types";

export type Folder = Tables<"folders">;
export type FileRow = Tables<"files">;
export type FolderShare = Tables<"folder_shares">;
export type ShareLink = Tables<"share_links">;
export type Profile = Tables<"profiles">;
export type Favorite = Tables<"favorites">;
export type Repository = Tables<"repositories">;
export type UserRole = Enums<"user_role">;

export type CreateActionTarget = {
  folderId: string | null;
  allowLock?: boolean;
};

export type ViewSelection =
  | { kind: "home" }
  | { kind: "folder"; folderId: string | null }
  | { kind: "shared" }
  | { kind: "favorites" }
  | { kind: "trash" }
  | { kind: "members" }
  | { kind: "repositories" };
