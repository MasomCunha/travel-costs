import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const GROUP_COOKIE = "active_group";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  return user;
}

// Resolve o grupo ativo (cookie -> 1.ª associação). Redireciona para onboarding se não houver.
export async function requireContext() {
  const user = await requireUser();
  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { group: true },
    orderBy: { group: { createdAt: "asc" } },
  });
  if (memberships.length === 0) redirect("/groups/new");

  const cookieStore = await cookies();
  const wanted = cookieStore.get(GROUP_COOKIE)?.value;
  const active =
    memberships.find((m) => m.groupId === wanted) ?? memberships[0];

  const member = await prisma.member.findFirst({
    where: { groupId: active.groupId, userId: user.id },
  });

  return {
    user,
    group: active.group,
    role: active.role,
    member, // pode ser null se o utilizador ainda não estiver ligado a um participante
    groups: memberships.map((m) => ({ id: m.groupId, name: m.group.name, role: m.role })),
  };
}

export async function setActiveGroup(groupId: string) {
  const cookieStore = await cookies();
  cookieStore.set(GROUP_COOKIE, groupId, { httpOnly: true, sameSite: "lax", path: "/" });
}
