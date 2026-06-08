import Link from "next/link";
import { requireContext } from "@/lib/session";
import { computeGroupBalances, counterpartiesFor } from "@/lib/balances";
import { eur, rides } from "@/lib/constants";
import { SettleForm } from "@/components/SettleForm";

export default async function DashboardPage() {
  const ctx = await requireContext();

  if (!ctx.member) {
    return (
      <div className="card max-w-lg">
        <h1 className="text-lg font-semibold">Bem-vindo, {ctx.user.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Para veres "o que deves e quem te deve", liga a tua conta a um participante do grupo.
        </p>
        <Link href="/members" className="btn-primary mt-4">Ir aos membros</Link>
      </div>
    );
  }

  const bal = await computeGroupBalances(ctx.group.id);
  const counterparties = counterpartiesFor(bal, ctx.member.id);

  const iOwe = counterparties.filter((c) => c.euros > 0.005 || c.rides > 0.005);
  const oweMe = counterparties.filter((c) => c.euros < -0.005 || c.rides < -0.005);
  const totalOwe = iOwe.reduce((s, c) => s + Math.max(0, c.euros), 0);
  const totalOweMe = oweMe.reduce((s, c) => s + Math.max(0, -c.euros), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {ctx.member.name}</h1>
        <p className="text-sm text-slate-500">Resumo das tuas contas no grupo {ctx.group.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card border-red-100 bg-red-50/40">
          <p className="text-sm font-medium text-red-700">Devo no total</p>
          <p className="mt-1 text-3xl font-bold text-red-700">{eur(totalOwe)}</p>
        </div>
        <div className="card border-emerald-100 bg-emerald-50/40">
          <p className="text-sm font-medium text-emerald-700">Devem-me no total</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{eur(totalOweMe)}</p>
        </div>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">A quem devo</h2>
        {iOwe.length === 0 ? (
          <p className="text-sm text-slate-500">Não deves nada a ninguém. 🎉</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {iOwe.map((c) => (
              <li key={c.member.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <span className="font-medium">{c.member.name}</span>
                  {!c.member.active && <span className="badge ml-2 bg-slate-100 text-slate-500">removido</span>}
                  <div className="text-sm text-slate-500">
                    {c.euros > 0.005 && <span className="text-red-600">{eur(c.euros)}</span>}
                    {c.euros > 0.005 && c.rides > 0.005 && " · "}
                    {c.rides > 0.005 && <span>{rides(c.rides)} em dívida</span>}
                  </div>
                </div>
                {c.euros > 0.005 && (
                  <SettleForm
                    memberId={ctx.member!.id}
                    otherId={c.member.id}
                    otherName={c.member.name}
                    otherPhone={c.member.phone}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="mb-3 text-lg font-semibold">Quem me deve</h2>
        {oweMe.length === 0 ? (
          <p className="text-sm text-slate-500">Ninguém te deve nada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {oweMe.map((c) => (
              <li key={c.member.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium">{c.member.name}</span>
                  {!c.member.active && <span className="badge ml-2 bg-slate-100 text-slate-500">removido</span>}
                  <div className="text-sm text-slate-500">
                    {c.euros < -0.005 && <span className="text-emerald-600">{eur(-c.euros)}</span>}
                    {c.euros < -0.005 && c.rides < -0.005 && " · "}
                    {c.rides < -0.005 && <span>{rides(-c.rides)} a teu favor</span>}
                  </div>
                </div>
                {c.member.phone && (
                  <span className="text-xs text-slate-400">MB WAY: {c.member.phone}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
