import Link from "next/link";
import { requireContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { tripValuePerPerson } from "@/lib/balances";
import { eur, formatDate, RIDE_TYPES, type RideType } from "@/lib/constants";
import { TripForm } from "@/components/TripForm";
import { deleteTripAction } from "@/app/actions/trips";

export default async function TripsPage() {
  const ctx = await requireContext();
  const [activeMembers, trips] = await Promise.all([
    prisma.member.findMany({ where: { groupId: ctx.group.id, active: true }, orderBy: { name: "asc" } }),
    prisma.trip.findMany({
      where: { groupId: ctx.group.id },
      orderBy: { date: "desc" },
      include: { driver: true, passengers: { include: { passenger: true } } },
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Boleias</h1>

      <section className="card">
        <h2 className="mb-3 font-semibold">Registar nova boleia</h2>
        {activeMembers.length < 2 ? (
          <p className="text-sm text-slate-500">
            Precisas de pelo menos 2 <Link href="/members" className="text-brand-600 hover:underline">membros</Link> ativos.
          </p>
        ) : (
          <TripForm group={ctx.group} members={activeMembers} today={today} />
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 font-semibold">Histórico de boleias ({trips.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Condutor</th>
                <th className="py-2 pr-3">Passageiros</th>
                <th className="py-2 pr-3">€/pessoa</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(t.date)}</td>
                  <td className="py-2 pr-3 font-medium">{t.driver.name}</td>
                  <td className="py-2 pr-3">
                    <div className="flex flex-wrap gap-1">
                      {t.passengers.map((p) => (
                        <span key={p.id} className="badge bg-slate-100 text-slate-600">
                          {p.passenger.name}: {RIDE_TYPES[p.type as RideType]?.label ?? p.type}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{eur(tripValuePerPerson(t, ctx.group))}</td>
                  <td className="py-2">
                    {(ctx.role === "OWNER" || t.createdByUserId === ctx.user.id) && (
                      <form action={deleteTripAction}>
                        <input type="hidden" name="id" value={t.id} />
                        <button className="text-xs text-red-600 hover:underline" type="submit">apagar</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-center text-slate-400">Sem boleias registadas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
