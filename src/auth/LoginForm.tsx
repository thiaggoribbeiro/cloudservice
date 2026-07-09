import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { MailIcon } from "../components/ui/icons";
import { APP_VERSION } from "../lib/constants";
import { PasswordField } from "./PasswordField";
import { logEvent } from "../features/eventLog/eventLogApi";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (signInError) {
      setError("E-mail ou senha invalidos.");
    } else {
      logEvent("login", "sessao", email);
    }
  }

  return (
    <div className="force-light bg-grain relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-6">
      {/* Ambient wash anchoring the composition to the brand's warmth without tipping into a flat cream canvas */}
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
            <img src="/logo-login.png" alt="AvestaCloud" className="h-44 w-auto" />
          </div>

          <h1 className="text-center text-lg font-semibold leading-none text-brand-black/70">
            Entrar na nuvem
          </h1>
          <p className="mt-2 text-center text-sm text-brand-gray">
            Seus arquivos, pastas e compartilhamentos, organizados num só lugar.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
            <div className="stagger-2 flex flex-col gap-1">
              <label htmlFor="email" className="eyebrow text-brand-gray">
                E-mail
              </label>
              <div className="relative">
                <MailIcon className="field-pill-icon" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-pill"
                  placeholder="voce@empresa.com.br"
                />
              </div>
            </div>

            <div className="stagger-3">
              <PasswordField
                id="password"
                label="Senha"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-brand-primary">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary stagger-4 w-full py-3">
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mono-tag stagger-5 mt-5 text-center text-[11px] uppercase tracking-widest text-brand-gray">
          Acesso restrito · somente por convite
        </p>
        <p className="mono-tag stagger-5 mt-1 text-center text-[11px] uppercase tracking-widest text-brand-gray/60">
          Versão {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
