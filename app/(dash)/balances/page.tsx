import { requireContext } from "@/lib/session";
import { computeGroupBalances, netDebt } from "@/lib/balances";
import { eur } from "@/lib/constants";

export default async function BalancesPage() {
  const ctx = await requireContext();
  const bal = await computeGroupBalances(ctx.group.id);
  const members = bal.members;

  function cell(fromId: string, toId: string, kind: "euros" | "rides") {
    if (fromId === toId) return <td key={toId} className="bg-slate-50" />;
    const net = netDebt(bal.owes, fromId, toId)[kind];
    const v = Math.round(net * 100) / 100;
    const txt = kind === "euros" ? eur(Math.abs(v)) : `${Math.abs(v)}`;
    return (
      <td key={toId} className="px-3 py-2 text-right tabular-nums">
        {Math.abs(v) < 0.005 ? (
          <span className="text-slate-300">—</span>
        ) : v > 0 ? (
          <span className="text-red-600">{txt}</span>
        ) : (
          <span className="text-emerald-600">{txt}</span>
        )}
      </td>
    );
  }

  function Matrix({ kind, title }: { kind: "euros" | "rides"; title: string }) {
    return (
      <section className="card">
        <h2 className="mb-1 font-semibold">{title}</h2>
        <p className="mb-3 text-xs text-slate-500">
          Linha deve à coluna. <span className="text-red-600">Vermelho</span> = deve;{" "}
          <span className="text-emerald-600">verde</span> = crédito.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="px-3 py-2 text-left">deve ↓ / a →</th>
                {members.map((m) => (
                  <th key={m.id} className="px-3 py-2 text-right">{m.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((from) => (
                <tr key={from.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-left font-medium">
                    {from.name}
                    {!from.active && <span className="ml-1 text-xs text-slate-400">(rem.)</span>}
                  </td>
                  {members.map((to) => cell(from.id, to.id, kind))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Totais</h1>

      <Matrix kind="euros" title="Saldos em euros (Boleia / Euros)" />
      <Matrix kind="rides" title="Saldos em boleias (Boleia / Boleia)" />

      <section className="card">
        <h2 className="mb-3 font-semibold">Por membro</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-3">Membro</th>
                <th className="py-2 pr-3 text-right">Viagens (condutor)</th>
                <th className="py-2 pr-3 text-right">Viagens (passageiro)</th>
                <th className="py-2 pr-3 text-right">Pagou</th>
                <th className="py-2 pr-3 text-right">Recebeu</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const s = bal.perMember.get(m.id)!;
                return (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 font-medium">{m.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.tripsAsDriver}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.tripsAsPassenger}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{eur(s.paid)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{eur(s.received)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
