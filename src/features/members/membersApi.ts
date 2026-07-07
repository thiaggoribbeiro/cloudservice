import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import type { Profile, UserRole } from "../../types/domain";

export async function listMembers(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at");
  if (error) throw error;
  return data;
}

export type ShareableFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  owner_email: string;
};

// Folders the caller owns - used for the Convidado folder picker when the
// caller is a Gestor (can only grant access to what they personally own).
export async function listOwnedFoldersForSharing(
  ownerId: string,
  ownerEmail: string,
): Promise<ShareableFolder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, parent_id, owner_id")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return data.map((f) => ({ ...f, owner_email: ownerEmail }));
}

// Every folder in the system - only ever returns rows when the caller is an
// admin (the RPC self-filters server-side); used for the Convidado folder
// picker when the caller is an Administrador.
export async function listAllFoldersForSharing(): Promise<ShareableFolder[]> {
  const { data, error } = await supabase.rpc("admin_list_all_folders");
  if (error) throw error;
  return data;
}

// The create-member function always responds with JSON, including on
// non-2xx statuses - supabase-js surfaces those as a FunctionsHttpError with
// only the raw Response attached, so the specific Portuguese message has to
// be pulled back out of it manually.
async function invokeMemberFunction<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T | { error: string }>("create-member", {
    body,
  });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      throw new Error(payload?.error || error.message);
    }
    throw error;
  }
  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}

export type CreateMemberPayload = {
  email: string;
  display_name: string;
  role: Exclude<UserRole, "admin">;
  folder_id?: string;
};

export type CreateMemberResult = {
  user_id: string;
  email: string;
  temporary_password: string;
};

export async function createMember(payload: CreateMemberPayload): Promise<CreateMemberResult> {
  return invokeMemberFunction<CreateMemberResult>({ action: "create", ...payload });
}

export type UpdateMemberPayload = {
  user_id: string;
  display_name: string;
  role: Exclude<UserRole, "admin">;
};

export async function updateMember(payload: UpdateMemberPayload): Promise<void> {
  await invokeMemberFunction<{ user_id: string }>({ action: "update", ...payload });
}

export type ResetPasswordResult = {
  user_id: string;
  email: string;
  temporary_password: string;
};

export async function resetMemberPassword(userId: string): Promise<ResetPasswordResult> {
  return invokeMemberFunction<ResetPasswordResult>({ action: "reset_password", user_id: userId });
}

export async function deleteMember(userId: string): Promise<void> {
  await invokeMemberFunction<{ user_id: string }>({ action: "delete", user_id: userId });
}
