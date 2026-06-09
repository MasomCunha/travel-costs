import { requireContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { tripValuePerPerson } from "@/lib/balances";
import { eur, formatDate, PAYMENT_METHODS, RIDE_TYPES, type PaymentMethod, type RideType } from "@/lib/constants";
import { HistoryTabs } from "@/components/HistoryTabs";
import { deletePaymentAction } from "@/app/actions/payments";

type Entry =
  | { kind: "trip"; date: Date; id: string; node: React.ReactNode }
  | { kind: "payment"; date: Date; id: string; node: React.ReactNode };

export default async function HistoryPage() {
  const ctx = await requireContext();
  const [trips, payments] = await Promise.all([
    prisma.trip.findMany({
      where: { groupId: ctx.group.id },
      include: { driver: true, passengers: { include: { passenger: true } } },
    }),
    prisma.payment.findMany({
      where: { groupId: ctx.group.id },
      orderBy: { date: "desc" },
      include: { payer: true, payee: true },
    }),
  ]);

  const entries: Entry[] = [];
  for (const t of trips) {
    entries.push({
      kind: "trip",
      date: t.date,
      id: t.id,
      node: (
        <div>
          <span className="badge bg-blue-100 text-blue-700">Boleia</span>{" "}
          <span className="font-medium">{t.driver.name}</span> conduziu ({eur(tripValuePerPerson(t, ctx.group))}/pessoa) —{" "}
          {t.passengers.map((p, i) => (
            <span key={p.id}>
              {i > 0 && ", "}
              {p.passenger.name}: {RIDE_TYPES[p.type as RideType]?.label ?? p.type}
            </span>
          ))}
        </div>
      ),
    });
  }
  for (const p of payments) {
    entries.push({
      kind: "payment",
      date: p.date,
      id: p.id,
      node: (
        <div>
          <span className="badge bg-emerald-100 text-emerald-700">Pagamento</span>{" "}
          <span className="font-medium">{p.payer.name}</span> pagou{" "}
          <span className="text-emerald-700">{eur(p.amount)}</span> a{" "}
          <span className="font-medium">{p.payee.name}</span> ·{" "}
          {PAYMENT_METHODS[p.method as PaymentMethod] ?? p.method}
          {p.note ? ` · ${p.note}` : ""}
        </div>
      ),
    });
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const general = (
    <section className="card">
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">Sem registos.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={`${e.kind}-${e.id}`} className="flex gap-3 py-3 text-sm">
              <span className="w-24 shrink-0 text-slate-400">{formatDate(e.date)}</span>
              <div className="flex-1">{e.node}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const paymentsPanel = (
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
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico</h1>
      <HistoryTabs general={general} payments={paymentsPanel} />
    </div>
  );
}
