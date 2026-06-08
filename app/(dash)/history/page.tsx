import { requireContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { tripValuePerPerson } from "@/lib/balances";
import { eur, formatDate, PAYMENT_METHODS, RIDE_TYPES, type PaymentMethod, type RideType } from "@/lib/constants";

type Entry =
  | { kind: "trip"; date: Date; id: string; node: React.ReactNode }
  | { kind: "payment"; date: Date; id: string; node: React.ReactNode };

export default async function HistoryPage() {
  const ctx = await requireContext();
  const [trips, payments] = await Promise.all([
    prisma.trip.findMany({
      where: { groupId: ctx.group.id },
      include: { route: true, driver: true, passengers: { include: { passenger: true } } },
    }),
    prisma.payment.findMany({
      where: { groupId: ctx.group.id },
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
          <span className="font-medium">{t.driver.name}</span> conduziu ({t.route.name},{" "}
          {eur(tripValuePerPerson(t))}/pessoa) —{" "}
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico</h1>
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
    </div>
  );
}
