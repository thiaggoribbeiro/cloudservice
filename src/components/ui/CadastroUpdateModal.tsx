import { useState, type FormEvent } from "react";
import { submitCollaboratorRegistration } from "../../lib/collaboratorRegistration";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Mesmo formulário e mesma regra do portal do AvestaID (CadastroUpdateModal.tsx
// lá), replicado aqui porque muita gente bookmarca a URL do Cloud Service
// direto, pulando o portal e o gate que roda lá. Sem botão de fechar, sem
// fechar no clique fora -- fica até salvar. Não usa o componente <Modal>
// compartilhado de propósito: aquele fecha com X/clique fora.
export function CadastroUpdateModal({ accessToken, onDone }: { accessToken: string; onDone: () => void }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [machineHost, setMachineHost] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = whatsapp.trim() && machineHost.trim() && birthDay && birthMonth && department.trim();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await submitCollaboratorRegistration(accessToken, {
        whatsapp: whatsapp.trim(),
        machine_host: machineHost.trim(),
        birth_day: Number(birthDay),
        birth_month: Number(birthMonth),
        department: department.trim(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cadastro.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-light-scrim/55 px-3 py-3 backdrop-blur-[1px] sm:px-4 sm:py-6 md:items-center">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-light-outline-variant bg-light-surface-container-lowest shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="cadastro-title sm:max-h-[calc(100vh-3rem)]">
        <div className="shrink-0 border-b border-light-outline-variant px-6 py-4">
          <h2 id="cadastro-title" className="font-headline text-headline-sm text-light-on-surface">Atualização cadastral</h2>
          <p className="mt-1 font-body text-body-sm text-light-on-surface-variant">
            Antes de continuar, precisamos atualizar alguns dados do seu cadastro na Avesta. Leva menos de um minuto.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-6">
          <div className="flex flex-col gap-gutter-md">
            <div>
              <label className="field-label">Contato WhatsApp</label>
              <input
                required
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(11) 91234-5678"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Host da máquina</label>
              <input
                required
                value={machineHost}
                onChange={(e) => setMachineHost(e.target.value)}
                className="field-input"
              />
              <p className="field-hint flex items-center gap-1.5">
                Procure pelo ícone
                <img src="/icon-host-maquina.png" alt="" className="inline-block h-4 w-4 rounded-sm" />
                próximo ao relógio
              </p>
            </div>

            <div>
              <label className="field-label">Dia e mês de nascimento</label>
              <div className="flex gap-2.5">
                <select required value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className="field-input">
                  <option value="" disabled>Dia</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select required value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className="field-input">
                  <option value="" disabled>Mês</option>
                  {MESES.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Setor</label>
              <input
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Comercial, Financeiro, TI..."
                className="field-input"
              />
            </div>
          </div>

          {error && <p role="alert" className="mt-3 font-body text-body-sm text-light-error">{error}</p>}

          <button type="submit" disabled={!valid || saving} className="btn-primary mt-5 w-full">
            {saving ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
