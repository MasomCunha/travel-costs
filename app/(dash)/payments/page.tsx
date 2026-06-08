import { requireContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { eur, formatDate, PAYMENT_METHODS, PAYMENT_METHOD_KEYS, type PaymentMethod } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import { createPaymentAction, deletePaymentAction } from "@/app/actions/payments";

export default async function PaymentsPage() {
  const ctx = await requireContext();
  const [members, activeMembers, payments] = await Promise.all([
    prisma.member.findMany({ where: { groupId: ctx.group.id }, orderBy: { name: "asc" } }),
    prisma.member.findMany({ where: { groupId: ctx.group.id, active: true }, orderBy: { name: "asc" } }),
    prisma.payment.findMany({
      where: { groupId: ctx.group.id },
      orderBy: { date: "desc" },
      include: { payer: true, payee: true },
    }),
  ]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pagamentos</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold">Registar pagamento</h2>
        <form action={createPaymentAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="label">Data</label>
            <input name="date" type="date" defaultValue={today} className="input" required />
          </div>
          <div>
            <label className="label">Quem pagou</label>
            <select name="payerId" className="input" required>
              {activeMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">A quem</label>
            <select name="payeeId" className="input" required>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{!m.active ? " (removido)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Valor €</label>
            <input name="amount" type="number" step="0.01" min="0.01" className="input" required />
          </div>
          <div>
            <label className="label">Método</label>
            <select name="method" className="input" defaultValue="MBWAY">
              {PAYMENT_METHOD_KEYS.map((k) => (
                <option key={k} value={k}>{PAYMENT_METHODS[k]}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Nota (opcional)</label>
            <input name="note" className="input" />
          </div>
          <div className="flex items-end">
            <SubmitButton>Registar</SubmitButton>
          </div>
        </form>
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Histórico de pagamentos ({payments.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">De</th>
                <th className="py-2 pr-3">Para</th>
                <th className="py-2 pr-3">Valor</th>
                <th className="py-2 pr-3">Método</th>
                <th className="py-2 pr-3">Nota</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(p.date)}</td>
                  <td className="py-2 pr-3 font-medium">{p.payer.name}</td>
                  <td className="py-2 pr-3 font-medium">{p.payee.name}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-emerald-700">{eur(p.amount)}</td>
                  <td className="py-2 pr-3">{PAYMENT_METHODS[p.method as PaymentMethod] ?? p.method}</td>
                  <td className="py-2 pr-3 text-slate-500">{p.note}</td>
                  <td className="py-2">
                    <form action={deletePaymentAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-xs text-red-600 hover:underline" type="submit">apagar</button>
                    </form>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-slate-400">Sem pagamentos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
