import { createGroupAction, joinGroupAction, switchGroupAction } from "@/app/actions/groups";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

const FIELDS = [
  { name: "fuelPrice", label: "Combustível €/L", step: "0.01", placeholder: "1.80" },
  { name: "totalKm", label: "KM (ida/volta)", step: "1", placeholder: "60" },
  { name: "consumptionPer100", label: "Consumo L/100", step: "0.1", placeholder: "6" },
  { name: "tolls", label: "Portagens €", step: "0.01", placeholder: "0" },
  { name: "avgPeople", label: "Nº médio pessoas", step: "0.5", placeholder: "4" },
] as const;

export default async function NewGroupPage() {
  const user = await requireUser();
  const [groups, memberships] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.membership.findMany({ where: { userId: user.id }, select: { groupId: true } }),
  ]);
  const memberOf = new Set(memberships.map((m) => m.groupId));

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-xl">
        <h1 className="mb-1 text-xl font-semibold">Criar grupo de boleias</h1>
        <p className="mb-5 text-sm text-slate-500">
          Um grupo é uma rota: junta as pessoas que a partilham e os parâmetros de custo.
        </p>
        <form action={createGroupAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Nome do grupo</label>
            <input id="name" name="name" className="input" placeholder="Braga - Famalicão" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="label">{f.label}</label>
                <input
                  name={f.name}
                  type="number"
                  step={f.step}
                  placeholder={f.placeholder}
                  className="input"
                  required
                />
              </div>
            ))}
          </div>
          <SubmitButton className="btn-primary w-full">Criar grupo</SubmitButton>
        </form>

        {groups.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-medium text-slate-600">Ou entrar num grupo existente:</p>
            <div className="space-y-2">
              {groups.map((g) => {
                const joined = memberOf.has(g.id);
                return (
                  <form key={g.id} action={joined ? switchGroupAction : joinGroupAction}>
                    <input type="hidden" name="groupId" value={g.id} />
                    <button className="btn-ghost w-full justify-between" type="submit">
                      <span>{g.name}</span>
                      <span className="text-xs text-slate-400">{joined ? "já és membro →" : "entrar →"}</span>
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
