import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import { MailIcon } from "../components/ui/icons";
import { APP_VERSION } from "../lib/constants";
import { PasswordField } from "./PasswordField";
import { logEvent } from "../features/eventLog/eventLogApi";
import * as avestaId from "../lib/avestaId";

const AVESTAID_ENABLED = import.meta.env.VITE_AVESTAID_ENABLED === "true";

export function LoginForm() {
  // Under AvestaID there's no local login form — hand off to the portal,
  // same as AuthProvider's own boot check.
  useEffect(() => {
    if (AVESTAID_ENABLED && !avestaId.hasCallbackCode()) avestaId.ensureSession();
  }, []);

  if (AVESTAID_ENABLED) return <div className="min-h-screen bg-light-background" />;

  return <LocalLoginForm />;
}

function LocalLoginForm() {
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
    <div className="force-light flex min-h-screen flex-col items-center justify-center bg-light-background px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="stagger-0 card overflow-hidden">
          <div className="h-1 bg-light-primary" aria-hidden="true" />
          <div className="p-8 sm:p-10">
            <div className="flex justify-center pb-6">
              <img src="/logo-login.png" alt="Cloud Service - Avesta" className="h-32 w-auto" />
            </div>

            <h1 className="text-center font-headline text-headline-md text-light-on-surface">Entrar na nuvem</h1>
            <p className="mt-1 text-center font-body text-body-sm text-light-on-surface-variant">
              Seus arquivos, pastas e compartilhamentos num só lugar.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-gutter-md">
              <div className="stagger-1 flex flex-col">
                <label htmlFor="email" className="field-label">
                  E-mail
                </label>
                <div className="relative">
                  <MailIcon className="field-pill-icon h-[18px] w-[18px]" />
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

              <div className="stagger-2">
                <PasswordField
                  id="password"
                  label="Senha"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {submitting ? "Entrando…" : "Entrar"}
              </button>
            </form>
          </div>
        </div>

        <p className="stagger-4 mt-5 text-center font-body text-body-sm text-light-on-surface-variant">
          Acesso restrito, somente por convite
        </p>
        <p className="stagger-4 mt-1 text-center font-body text-[11px] leading-4 text-light-outline">
          Versão {APP_VERSION}
        </p>
      </div>
    </div>
  );
}
