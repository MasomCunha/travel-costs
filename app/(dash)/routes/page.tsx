import { requireContext } from "@/lib/session";
import { eur } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import { updateGroupParamsAction } from "@/app/actions/routes";

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
  const group = ctx.group;
  const canEdit = ctx.role === "OWNER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parâmetros</h1>
        <p className="text-sm text-slate-500">
          Cada grupo é uma rota com estes parâmetros por defeito; o valor por pessoa é
          calculado automaticamente. Podes ajustá-los viagem a viagem ao criar uma boleia.
        </p>
      </div>

      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{group.name}</h2>
          <span className="badge bg-brand-100 text-brand-700">{eur(valuePerPerson(group))} / pessoa</span>
        </div>
        {!canEdit && (
          <p className="mb-3 text-sm text-amber-600">Só o dono do grupo pode editar os parâmetros.</p>
        )}
        <form action={updateGroupParamsAction} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="label">{f.label}</label>
              <input
                name={f.name}
                type="number"
                step={f.step}
                defaultValue={group[f.name]}
                className="input"
                required
                disabled={!canEdit}
              />
            </div>
          ))}
          {canEdit && (
            <div className="col-span-2 flex items-end sm:col-span-3 lg:col-span-5">
              <SubmitButton>Guardar parâmetros</SubmitButton>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
