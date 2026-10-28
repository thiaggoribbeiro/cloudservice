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
    <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-black/45 px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-6 md:items-center">
      <div className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-brand-border bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface sm:max-h-[calc(100vh-3rem)]">
        <div className="shrink-0 border-b border-brand-border px-5 py-4 dark:border-white/10 sm:px-6">
          <h2 className="text-lg text-brand-black dark:text-white sm:text-xl">Atualização cadastral</h2>
          <p className="mt-1 text-sm text-brand-gray">
            Antes de continuar, precisamos atualizar alguns dados do seu cadastro na Avesta. Leva menos de um minuto.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm text-brand-black dark:text-white">Contato WhatsApp</label>
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
              <label className="mb-1.5 block text-sm text-brand-black dark:text-white">Host da máquina</label>
              <input
                required
                value={machineHost}
                onChange={(e) => setMachineHost(e.target.value)}
                className="field-input"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-gray">
                Procure pelo ícone
                <img src="/icon-host-maquina.png" alt="" className="inline-block h-4 w-4 rounded-sm" />
                próximo ao relógio
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-brand-black dark:text-white">Dia e mês de nascimento</label>
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
              <label className="mb-1.5 block text-sm text-brand-black dark:text-white">Setor</label>
              <input
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: Comercial, Financeiro, TI..."
                className="field-input"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-brand-primary">{error}</p>}

          <button type="submit" disabled={!valid || saving} className="btn-primary mt-5 w-full">
            {saving ? "Salvando..." : "Salvar e continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
