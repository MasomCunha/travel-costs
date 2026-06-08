import { requireContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { eur } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import { createRouteAction, updateRouteAction, deleteRouteAction } from "@/app/actions/routes";

function valuePerPerson(r: {
  fuelPrice: number;
  totalKm: number;
  consumptionPer100: number;
  tolls: number;
  avgPeople: number;
}) {
  if (!r.avgPeople) return 0;
  return ((r.consumptionPer100 / 100) * r.totalKm * r.fuelPrice + r.tolls) / r.avgPeople;
}

const FIELDS = [
  { name: "fuelPrice", label: "Combustível €/L", step: "0.01" },
  { name: "totalKm", label: "KM (ida/volta)", step: "1" },
  { name: "consumptionPer100", label: "Consumo L/100", step: "0.1" },
  { name: "tolls", label: "Portagens €", step: "0.01" },
  { name: "avgPeople", label: "Nº médio pessoas", step: "0.5" },
] as const;

export default async function RoutesPage() {
  const ctx = await requireContext();
  const routes = await prisma.route.findMany({
    where: { groupId: ctx.group.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { trips: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Rotas</h1>
        <p className="text-sm text-slate-500">
          Cada rota tem parâmetros por defeito; o valor por pessoa é calculado automaticamente.
          Podes ajustar os parâmetros viagem a viagem ao criar uma boleia.
        </p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold">Nova rota</h2>
        <form action={createRouteAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <label className="label">Nome</label>
            <input name="name" className="input" placeholder="Braga - Porto" required />
          </div>
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input name={f.name} type="number" step={f.step} className="input" required />
            </div>
          ))}
          <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-6">
            <SubmitButton>Criar rota</SubmitButton>
          </div>
        </form>
      </section>

      <div className="space-y-3">
        {routes.map((r) => (
          <div key={r.id} className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{r.name}</h3>
              <span className="badge bg-brand-100 text-brand-700">
                {eur(valuePerPerson(r))} / pessoa · {r._count.trips} viagens
              </span>
            </div>
            <form action={updateRouteAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <input type="hidden" name="id" value={r.id} />
              <div className="col-span-2 sm:col-span-3 lg:col-span-1">
                <label className="label">Nome</label>
                <input name="name" defaultValue={r.name} className="input" required />
              </div>
              {FIELDS.map((f) => (
                <div key={f.name}>
                  <label className="label">{f.label}</label>
                  <input
                    name={f.name}
                    type="number"
                    step={f.step}
                    defaultValue={r[f.name]}
                    className="input"
                    required
                  />
                </div>
              ))}
              <div className="col-span-2 flex items-end gap-2 sm:col-span-3 lg:col-span-6">
                <SubmitButton className="btn-ghost">Guardar</SubmitButton>
              </div>
            </form>
            {r._count.trips === 0 && (
              <form action={deleteRouteAction} className="mt-2 border-t border-slate-100 pt-2">
                <input type="hidden" name="id" value={r.id} />
                <button className="text-sm text-red-600 hover:underline" type="submit">
                  Apagar rota
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
