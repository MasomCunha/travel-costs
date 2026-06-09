"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, setActiveGroup } from "@/lib/session";
import { groupParamsSchema } from "@/lib/groupParams";

const createGroupSchema = groupParamsSchema.extend({
  name: z.string().min(2, "Nome obrigatório"),
});

export async function createGroupAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    fuelPrice: formData.get("fuelPrice"),
    totalKm: formData.get("totalKm"),
    consumptionPer100: formData.get("consumptionPer100"),
    tolls: formData.get("tolls"),
    avgPeople: formData.get("avgPeople"),
  });
  if (!parsed.success) return;

  const group = await prisma.group.create({
    data: {
      ...parsed.data,
      memberships: { create: { userId: user.id, role: "OWNER" } },
      // o criador entra como participante, ligado ao seu login
      members: { create: { name: user.name, userId: user.id, phone: user.phone } },
    },
  });
  await setActiveGroup(group.id);
  redirect("/");
}

// Entra num grupo existente (escolhido da lista). Cria a membership + um participante
// ligado ao utilizador, se ainda não existirem.
export async function joinGroupAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return;

  const existing = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  });
  if (!existing) {
    await prisma.membership.create({
      data: { userId: user.id, groupId, role: "MEMBER" },
    });
    // cria um participante para o utilizador, se ainda não houver um ligado a ele
    const member = await prisma.member.findFirst({ where: { groupId, userId: user.id } });
    if (!member) {
      await prisma.member.create({
        data: { groupId, name: user.name, userId: user.id, phone: user.phone },
      });
    }
  }

  await setActiveGroup(groupId);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function switchGroupAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const membership = await prisma.membership.findUnique({
    where: { userId_groupId: { userId: user.id, groupId } },
  });
  if (membership) await setActiveGroup(groupId);
  revalidatePath("/", "layout");
  redirect("/");
}
