import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ONE_POINT_FIVE_GIB = 1610612736;
const ASSIGNABLE_ROLES = ["user", "manager", "guest"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// Uses the caller's own JWT-scoped client (not the service-role `admin`
// client) so log_event()'s auth.uid() resolves to the admin/manager who
// triggered the action, and its admin-skip rule applies the same way it
// does everywhere else in the app.
async function logMemberEvent(
  caller: ReturnType<typeof createClient>,
  action: string,
  targetName: string | undefined,
  targetId: string | undefined,
): Promise<void> {
  const { error } = await caller.rpc("log_event", {
    p_action: action,
    p_target_type: "membro",
    p_target_name: targetName,
    p_target_id: targetId,
  });
  if (error) console.error("Falha ao registrar evento:", error.message);
}

// Cryptographically random, unambiguous-alphabet temporary password. Shown
// once to the admin/manager who created/reset the account so they can hand
// it to the member; the member is forced to replace it on next login.
function generateTemporaryPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalido" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- Bootstrap: create the very first administrator account. Self-closing
  // - becomes unreachable the moment a single admin profile exists.
  if (body.bootstrap === true) {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) return json({ error: countError.message }, 500);
    if ((count ?? 0) > 0) {
      return json({ error: "Ja existe um administrador. Bootstrap indisponivel." }, 403);
    }

    const { email, password, display_name } = body as {
      email?: string;
      password?: string;
      display_name?: string;
    };
    if (!email || !password || !display_name) {
      return json({ error: "email, password e display_name sao obrigatorios" }, 400);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name,
        role: "admin",
        storage_quota_bytes: ONE_POINT_FIVE_GIB,
        must_change_password: false,
      },
    });
    if (error) return json({ error: error.message }, 400);
    return json({ user_id: data.user?.id, email });
  }

  // ---- Every other action requires an authenticated admin/manager caller.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Nao autenticado" }, 401);

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user: callerUser },
    error: callerError,
  } = await caller.auth.getUser();
  if (callerError || !callerUser) return json({ error: "Nao autenticado" }, 401);

  const { data: callerProfile, error: callerProfileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerUser.id)
    .single();
  if (callerProfileError || !callerProfile) return json({ error: "Perfil nao encontrado" }, 403);
  if (callerProfile.role !== "admin" && callerProfile.role !== "manager") {
    return json({ error: "Sem permissao para gerenciar membros" }, 403);
  }

  const action = (body.action as string | undefined) ?? "create";

  // ---- create: admin/manager creates a new member.
  if (action === "create") {
    const { email, display_name, role, folder_id } = body as {
      email?: string;
      display_name?: string;
      role?: AssignableRole;
      folder_id?: string;
    };

    if (!email || !display_name || !role) {
      return json({ error: "email, display_name e role sao obrigatorios" }, 400);
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return json({ error: "Papel invalido" }, 400);
    }

    if (folder_id) {
      const { data: folder, error: folderError } = await admin
        .from("folders")
        .select("id, owner_id, deleted_at")
        .eq("id", folder_id)
        .maybeSingle();
      if (folderError || !folder || folder.deleted_at) {
        return json({ error: "Pasta nao encontrada" }, 404);
      }
      if (callerProfile.role !== "admin" && folder.owner_id !== callerUser.id) {
        return json({ error: "Voce so pode compartilhar pastas que voce possui" }, 403);
      }
    }

    const temporaryPassword = generateTemporaryPassword();
    const quota = role === "guest" ? 0 : ONE_POINT_FIVE_GIB;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        display_name,
        role,
        storage_quota_bytes: quota,
        must_change_password: true,
      },
    });
    if (createError) return json({ error: createError.message }, 400);

    const newUserId = created.user?.id;
    if (role === "guest" && folder_id && newUserId) {
      const { error: shareError } = await admin.from("folder_shares").insert({
        folder_id,
        shared_with_user_id: newUserId,
        granted_by: callerUser.id,
        permission: "view_edit",
      });
      if (shareError) {
        return json(
          { error: `Membro criado, mas falhou ao compartilhar a pasta: ${shareError.message}` },
          500,
        );
      }
    }

    await logMemberEvent(caller, "criar_membro", display_name, newUserId);
    return json({ user_id: newUserId, email, temporary_password: temporaryPassword });
  }

  // ---- Every remaining action targets an existing member by id, and none
  // of them may target an Administrador account or the caller themselves.
  const targetUserId = body.user_id as string | undefined;
  if (!targetUserId) return json({ error: "user_id obrigatorio" }, 400);
  if (targetUserId === callerUser.id) {
    return json({ error: "Voce nao pode gerenciar sua propria conta por aqui" }, 403);
  }

  const { data: targetProfile, error: targetProfileError } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetProfileError || !targetProfile) return json({ error: "Membro nao encontrado" }, 404);
  if (targetProfile.role === "admin") {
    return json({ error: "Contas de administrador nao podem ser gerenciadas por aqui" }, 403);
  }

  // ---- update: change display_name and/or role.
  if (action === "update") {
    const { display_name, role } = body as { display_name?: string; role?: AssignableRole };
    if (!display_name || !role) {
      return json({ error: "display_name e role sao obrigatorios" }, 400);
    }
    if (!ASSIGNABLE_ROLES.includes(role)) {
      return json({ error: "Papel invalido" }, 400);
    }

    const quota = role === "guest" ? 0 : ONE_POINT_FIVE_GIB;
    const { error: updateError } = await admin
      .from("profiles")
      .update({ display_name, role, storage_quota_bytes: quota })
      .eq("id", targetUserId);
    if (updateError) return json({ error: updateError.message }, 400);

    await logMemberEvent(caller, "editar_membro", display_name, targetUserId);
    return json({ user_id: targetUserId });
  }

  // ---- reset_password: generate and set a new temporary password, forcing
  // the member through the "set a new password" flow on next login.
  if (action === "reset_password") {
    const temporaryPassword = generateTemporaryPassword();
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(targetUserId, {
      password: temporaryPassword,
    });
    if (authUpdateError) return json({ error: authUpdateError.message }, 400);

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", targetUserId);
    if (profileUpdateError) return json({ error: profileUpdateError.message }, 500);

    await logMemberEvent(caller, "resetar_senha_membro", targetProfile.email, targetUserId);
    return json({ user_id: targetUserId, email: targetProfile.email, temporary_password: temporaryPassword });
  }

  // ---- delete: remove the account entirely (cascades to their owned
  // folders/files/shares via FK constraints).
  if (action === "delete") {
    await logMemberEvent(caller, "excluir_membro", targetProfile.email, targetUserId);
    const { error: deleteError } = await admin.auth.admin.deleteUser(targetUserId);
    if (deleteError) return json({ error: deleteError.message }, 400);
    return json({ user_id: targetUserId });
  }

  return json({ error: "Acao invalida" }, 400);
});
