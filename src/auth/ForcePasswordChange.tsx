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
    <div className="force-light bg-grain relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-6">
      <div
        aria-hidden
        className="wash-pale pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full opacity-70 blur-3xl"
      />
      <div
        aria-hidden
        className="wash-secondary pointer-events-none absolute -bottom-48 -left-32 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="stagger-1 relative rounded-2xl border border-brand-border bg-white p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.25)]">
          <div className="stagger-0 flex justify-center pb-8">
            <img src="/logo-login.png" alt="AvestaCloud" className="h-36 w-auto" />
          </div>

          <h1 className="text-center text-2xl leading-none text-brand-black/70">
            Defina sua senha
          </h1>
          <p className="mt-2 text-center text-sm text-brand-gray">
            Esta e a sua primeira vez aqui. Escolha uma nova senha para continuar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            <div className="stagger-2">
              <PasswordField
                id="new-password"
                label="Nova senha"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="stagger-3">
              <PasswordField
                id="confirm-password"
                label="Confirme a nova senha"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-brand-primary">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary stagger-4 w-full py-3">
              {submitting ? "Salvando…" : "Definir senha e continuar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
