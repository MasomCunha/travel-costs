import { createGroupAction } from "@/app/actions/groups";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { switchGroupAction } from "@/app/actions/groups";

export default async function NewGroupPage() {
  const user = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { group: true },
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md">
        <h1 className="mb-1 text-xl font-semibold">Criar grupo de boleias</h1>
        <p className="mb-5 text-sm text-slate-500">
          Um grupo junta as pessoas que partilham boleias e os respetivos custos.
        </p>
        <form action={createGroupAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Nome do grupo</label>
            <input id="name" name="name" className="input" placeholder="Boleias OPT" required autoFocus />
          </div>
          <SubmitButton className="btn-primary w-full">Criar grupo</SubmitButton>
        </form>

        {memberships.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-medium text-slate-600">Ou entrar num grupo existente:</p>
            <div className="space-y-2">
              {memberships.map((m) => (
                <form key={m.groupId} action={switchGroupAction}>
                  <input type="hidden" name="groupId" value={m.groupId} />
                  <button className="btn-ghost w-full justify-between" type="submit">
                    <span>{m.group.name}</span>
                    <span aria-hidden>→</span>
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
