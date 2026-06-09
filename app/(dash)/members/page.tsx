import { requireContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computeGroupBalances, netDebt } from "@/lib/balances";
import { eur } from "@/lib/constants";
import { SubmitButton } from "@/components/SubmitButton";
import {
  addMemberAction,
  updateMemberAction,
  removeMemberAction,
  reactivateMemberAction,
  promoteToOwnerAction,
  linkSelfAction,
} from "@/app/actions/members";

export default async function MembersPage() {
  const ctx = await requireContext();
  const isOwner = ctx.role === "OWNER";

  const [members, memberships, bal] = await Promise.all([
    prisma.member.findMany({
      where: { groupId: ctx.group.id },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.membership.findMany({ where: { groupId: ctx.group.id } }),
    computeGroupBalances(ctx.group.id),
  ]);

  // role por utilizador (para mostrar quem é owner) e candidatos a adicionar
  const roleByUser = new Map(memberships.map((m) => [m.userId, m.role]));
  const candidates = isOwner
    ? await prisma.user.findMany({
        where: { id: { notIn: memberships.map((m) => m.userId) } },
        orderBy: { name: "asc" },
      })
    : [];

  // saldo líquido total (em euros) de cada membro face aos restantes
  function totalEuros(id: string) {
    return members.reduce((s, o) => (o.id === id ? s : s + netDebt(bal.owes, id, o.id).euros), 0);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Membros</h1>

      {isOwner && (
        <section className="card">
          <h2 className="mb-3 font-semibold">Adicionar membro</h2>
          {candidates.length === 0 ? (
            <p className="text-sm text-slate-500">
              Não há utilizadores registados disponíveis para adicionar. As pessoas têm de criar
              conta na app antes de poderem ser adicionadas ao grupo.
            </p>
          ) : (
            <form action={addMemberAction} className="flex flex-wrap items-end gap-3">
              <div className="flex-1">
                <label className="label" htmlFor="userId">Utilizador registado</label>
                <select id="userId" name="userId" className="input" required defaultValue="">
                  <option value="" disabled>Escolher pessoa…</option>
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
              <SubmitButton>Adicionar</SubmitButton>
            </form>
          )}
        </section>
      )}

      <div className="space-y-3">
        {members.map((m) => {
          const isMe = m.userId === ctx.user.id;
          const memberIsOwner = m.userId ? roleByUser.get(m.userId) === "OWNER" : false;
          const saldo = Math.round(totalEuros(m.id) * 100) / 100;
          const canRemove = m.active && (isOwner || isMe);
          const canClaim = !isMe && !m.userId;
          const canPromote = isOwner && !isMe && !!m.userId && !memberIsOwner && m.active;
          const canReactivate = isOwner && !m.active;
          const showActions = canRemove || canClaim || canPromote || canReactivate;
          return (
            <div key={m.id} className={`card ${!m.active ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{m.name}</span>
                  {isMe && <span className="badge bg-brand-100 text-brand-700">eu</span>}
                  {memberIsOwner && <span className="badge bg-amber-100 text-amber-700">owner</span>}
                  {!m.active && <span className="badge bg-slate-100 text-slate-500">removido</span>}
                </div>
                <div className="text-sm">
                  {Math.abs(saldo) < 0.005 ? (
                    <span className="text-slate-400">saldado</span>
                  ) : saldo > 0 ? (
                    <span className="text-red-600">deve {eur(saldo)}</span>
                  ) : (
                    <span className="text-emerald-600">a receber {eur(-saldo)}</span>
                  )}
                </div>
              </div>

              {isMe && (
                <form action={updateMemberAction} className="mt-3 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="id" value={m.id} />
                  <div>
                    <label className="label">Nome</label>
                    <input name="name" defaultValue={m.name} className="input" required />
                  </div>
                  <div>
                    <label className="label">Telemóvel (MB WAY)</label>
                    <input name="phone" defaultValue={m.phone ?? ""} className="input" placeholder="912345678" />
                  </div>
                  <SubmitButton className="btn-ghost">Guardar</SubmitButton>
                </form>
              )}

              {showActions && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  {/* reclamar um participante legado sem login */}
                  {canClaim && (
                    <form action={linkSelfAction}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button className="text-sm text-brand-600 hover:underline" type="submit">
                        Sou eu
                      </button>
                    </form>
                  )}

                  {/* owner dá a role de owner a outro elemento */}
                  {canPromote && (
                    <form action={promoteToOwnerAction}>
                      <input type="hidden" name="userId" value={m.userId!} />
                      <button className="text-sm text-amber-600 hover:underline" type="submit">
                        Tornar owner
                      </button>
                    </form>
                  )}

                  {canRemove && (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-sm text-red-600 hover:underline" type="submit">
                        Remover
                      </button>
                    </form>
                  )}

                  {canReactivate && (
                    <form action={reactivateMemberAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="text-sm text-emerald-600 hover:underline" type="submit">
                        Reativar
                      </button>
                    </form>
                  )}
                </div>
              )}

              {!m.active && Math.abs(saldo) >= 0.005 && (
                <p className="mt-2 text-xs text-amber-600">
                  Membro removido com saldo por acertar — continua a aparecer até ser saldado.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
