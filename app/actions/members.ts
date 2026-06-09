"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";

const memberSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().trim().optional(),
});

// Owner adiciona ao grupo um utilizador JÁ registado na app (escolhido na drop-down).
// Cria a associação ao grupo (Membership) e o participante (Member) ligado ao login.
export async function addMemberAction(formData: FormData) {
  const ctx = await requireContext();
  if (ctx.role !== "OWNER") return; // só owners podem adicionar pessoas
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  await prisma.membership.upsert({
    where: { userId_groupId: { userId: user.id, groupId: ctx.group.id } },
    create: { userId: user.id, groupId: ctx.group.id, role: "MEMBER" },
    update: {},
  });

  // reaproveita (e reativa) um participante existente ligado a este login, ou cria um novo
  const existing = await prisma.member.findFirst({
    where: { groupId: ctx.group.id, userId: user.id },
  });
  if (existing) {
    await prisma.member.update({ where: { id: existing.id }, data: { active: true } });
  } else {
    await prisma.member.create({
      data: { groupId: ctx.group.id, name: user.name, userId: user.id, phone: user.phone },
    });
  }
  revalidatePath("/members");
  revalidatePath("/");
}

// Cada utilizador só pode alterar os seus próprios dados.
export async function updateMemberAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return;
  const member = await prisma.member.findFirst({ where: { id, groupId: ctx.group.id } });
  if (!member || member.userId !== ctx.user.id) return; // só os próprios dados

  const phone = parsed.data.phone || null;
  await prisma.member.update({
    where: { id: member.id },
    data: { name: parsed.data.name, phone },
  });
  // mantém o login sincronizado com o participante
  await prisma.user.update({
    where: { id: ctx.user.id },
    data: { name: parsed.data.name, phone },
  });
  revalidatePath("/members");
  revalidatePath("/", "layout");
}

// Remover (soft-delete): cada utilizador só se pode remover a si próprio; o owner remove todos.
// Marca o participante como inativo (preserva histórico/dívidas) E retira o acesso ao grupo.
export async function removeMemberAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  const member = await prisma.member.findFirst({ where: { id, groupId: ctx.group.id } });
  if (!member) return;
  const isOwner = ctx.role === "OWNER";
  const isMe = member.userId === ctx.user.id;
  if (!isOwner && !isMe) return; // só a si próprio, salvo owner

  if (member.userId) {
    const targetMembership = await prisma.membership.findUnique({
      where: { userId_groupId: { userId: member.userId, groupId: ctx.group.id } },
    });
    // não deixar o grupo ficar sem owner
    if (targetMembership?.role === "OWNER") {
      const owners = await prisma.membership.count({
        where: { groupId: ctx.group.id, role: "OWNER" },
      });
      if (owners <= 1) return;
    }
    await prisma.membership.deleteMany({
      where: { groupId: ctx.group.id, userId: member.userId },
    });
  }
  await prisma.member.update({ where: { id: member.id }, data: { active: false } });
  revalidatePath("/members");
  revalidatePath("/", "layout");
}

// Reativar um membro removido (só owner). Restaura o acesso ao grupo, se ligado a um login.
export async function reactivateMemberAction(formData: FormData) {
  const ctx = await requireContext();
  if (ctx.role !== "OWNER") return;
  const id = String(formData.get("id"));
  const member = await prisma.member.findFirst({ where: { id, groupId: ctx.group.id } });
  if (!member) return;
  await prisma.member.update({ where: { id: member.id }, data: { active: true } });
  if (member.userId) {
    await prisma.membership.upsert({
      where: { userId_groupId: { userId: member.userId, groupId: ctx.group.id } },
      create: { userId: member.userId, groupId: ctx.group.id, role: "MEMBER" },
      update: {},
    });
  }
  revalidatePath("/members");
  revalidatePath("/", "layout");
}

// Owner dá a role de owner a outro elemento do grupo (aditivo: o grupo pode ter vários owners).
export async function promoteToOwnerAction(formData: FormData) {
  const ctx = await requireContext();
  if (ctx.role !== "OWNER") return;
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;
  await prisma.membership.updateMany({
    where: { userId, groupId: ctx.group.id },
    data: { role: "OWNER" },
  });
  revalidatePath("/members");
}

// Liga o utilizador atual a um participante sem login (membro legado/histórico).
export async function linkSelfAction(formData: FormData) {
  const ctx = await requireContext();
  const memberId = String(formData.get("memberId"));
  const target = await prisma.member.findFirst({
    where: { id: memberId, groupId: ctx.group.id },
  });
  // só permite reclamar participantes ainda não ligados a nenhum login
  if (!target || target.userId) return;
  // remove a ligação de qualquer outro membro deste grupo a este utilizador
  await prisma.member.updateMany({
    where: { groupId: ctx.group.id, userId: ctx.user.id },
    data: { userId: null },
  });
  await prisma.member.update({
    where: { id: target.id },
    data: { userId: ctx.user.id },
  });
  revalidatePath("/", "layout");
}
