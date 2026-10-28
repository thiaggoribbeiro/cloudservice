// Formulário de "atualização cadastral" pedido pelo AvestaID a cada
// colaborador @avesta.com.br -- vive aqui também porque muita gente
// bookmarka a URL deste app direto, pulando o portal do AvestaID (e o
// gate que roda lá). Lê/grava sempre no projeto Supabase do AvestaID, não
// no deste app -- por isso usa fetch cru com as mesmas credenciais já
// usadas em avestaId.ts, em vez do client supabase-js deste projeto.
const AVESTAID_SUPABASE_URL = import.meta.env.VITE_AVESTAID_SUPABASE_URL as string;
const AVESTAID_SUPABASE_ANON_KEY = import.meta.env.VITE_AVESTAID_SUPABASE_ANON_KEY as string;
const APP_SLUG = "cloudservice";

export async function hasCompletedRegistration(userId: string): Promise<boolean> {
  const res = await fetch(`${AVESTAID_SUPABASE_URL}/rest/v1/rpc/has_completed_registration`, {
    method: "POST",
    headers: {
      apikey: AVESTAID_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${AVESTAID_SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_user_id: userId }),
  });
  if (!res.ok) throw new Error("Não foi possível verificar o cadastro.");
  return res.json();
}

export interface CollaboratorRegistration {
  whatsapp: string;
  machine_host: string;
  birth_day: number;
  birth_month: number;
  department: string;
}

// accessToken é o token que este app já tem (mintado pelo AvestaID
// especificamente pra ele) -- a function do AvestaID verifica a
// assinatura com a chave desse mesmo app pra confirmar quem está enviando,
// sem o Cloud Service precisar de nenhuma credencial própria do AvestaID.
export async function submitCollaboratorRegistration(
  accessToken: string,
  input: CollaboratorRegistration
): Promise<void> {
  const res = await fetch(`${AVESTAID_SUPABASE_URL}/functions/v1/submit-collaborator-details`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ app_slug: APP_SLUG, ...input }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Não foi possível salvar o cadastro.");
  }
}
