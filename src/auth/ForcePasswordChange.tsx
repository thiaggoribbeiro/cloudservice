import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./useAuth";
import { PasswordField } from "./PasswordField";

export function ForcePasswordChange() {
  const { session, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas nao coincidem.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError("Nao foi possivel definir a nova senha. Tente novamente.");
      return;
    }

    if (session) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", session.user.id);
    }
    await refreshProfile();
    setSubmitting(false);
  }

  return (
    <div className="force-light flex min-h-screen flex-col items-center justify-center bg-light-background px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="stagger-0 card overflow-hidden">
          <div className="h-1 bg-light-primary" aria-hidden="true" />
          <div className="p-8 sm:p-10">
            <div className="flex justify-center pb-6">
              <img src="/logo-login.png" alt="Cloud Service - Avesta" className="h-28 w-auto" />
            </div>

            <h1 className="text-center font-headline text-headline-md text-light-on-surface">Defina sua senha</h1>
            <p className="mt-1 text-center font-body text-body-sm text-light-on-surface-variant">
              É a sua primeira vez aqui. Escolha uma nova senha para continuar.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-gutter-md">
              <div className="stagger-1">
                <PasswordField
                  id="new-password"
                  label="Nova senha"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="field-hint">Mínimo de 8 caracteres.</p>
              </div>

              <div className="stagger-2">
                <PasswordField
                  id="confirm-password"
                  label="Confirme a nova senha"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-light-error-container px-3 py-2 font-body text-body-sm text-light-on-error-container"
                >
                  {error}
                </p>
              )}

              <button type="submit" disabled={submitting} className="btn-primary stagger-3 mt-2 w-full py-2.5">
                {submitting ? "Salvando…" : "Definir senha e continuar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
