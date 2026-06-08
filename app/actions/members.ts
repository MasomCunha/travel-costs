"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";

const memberSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  phone: z.string().trim().optional(),
});

export async function createMemberAction(formData: FormData) {
  const ctx = await requireContext();
  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return;
  await prisma.member.create({
    data: { groupId: ctx.group.id, name: parsed.data.name, phone: parsed.data.phone || null },
  });
  revalidatePath("/members");
}

export async function updateMemberAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  const parsed = memberSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return;
  // garante que o membro pertence ao grupo ativo
  await prisma.member.updateMany({
    where: { id, groupId: ctx.group.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  revalidatePath("/members");
}

// Soft-delete: nunca apaga. Preserva viagens/pagamentos e dívidas pendentes.
export async function setMemberActiveAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  await prisma.member.updateMany({ where: { id, groupId: ctx.group.id }, data: { active } });
  revalidatePath("/members");
  revalidatePath("/");
}

// Liga o utilizador atual a um participante (define quem sou "eu" no grupo).
export async function linkSelfAction(formData: FormData) {
  const ctx = await requireContext();
  const memberId = String(formData.get("memberId"));
  // remove a ligação de qualquer outro membro deste grupo a este utilizador
  await prisma.member.updateMany({
    where: { groupId: ctx.group.id, userId: ctx.user.id },
    data: { userId: null },
  });
  await prisma.member.updateMany({
    where: { id: memberId, groupId: ctx.group.id },
    data: { userId: ctx.user.id },
  });
  revalidatePath("/", "layout");
}
