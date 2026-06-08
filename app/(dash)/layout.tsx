import Link from "next/link";
import { requireContext } from "@/lib/session";
import { Nav } from "@/components/Nav";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { signOutAction } from "@/app/actions/auth";

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white p-4 md:w-64 md:border-b-0 md:border-r">
        <div className="mb-4">
          <p className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Grupo</p>
          <div className="mt-1">
            <GroupSwitcher groups={ctx.groups} activeId={ctx.group.id} />
          </div>
          <Link href="/groups/new" className="mt-1 inline-block px-1 text-xs text-brand-600 hover:underline">
            + Novo grupo
          </Link>
        </div>

        <Nav />

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="px-1 text-sm font-medium text-slate-700">{ctx.user.name}</p>
          <p className="px-1 text-xs text-slate-400">{ctx.user.email}</p>
          {!ctx.member && (
            <Link href="/members" className="mt-2 block px-1 text-xs text-amber-600 hover:underline">
              ⚠ Liga-te a um membro
            </Link>
          )}
          <form action={signOutAction} className="mt-3">
            <button className="btn-ghost w-full" type="submit">Sair</button>
          </form>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
