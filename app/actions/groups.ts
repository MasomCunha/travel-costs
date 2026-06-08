"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, setActiveGroup } from "@/lib/session";

export async function createGroupAction(formData: FormData) {
  const user = await requireUser();
  const name = z.string().min(2).safeParse(formData.get("name"));
  if (!name.success) return;

  const group = await prisma.group.create({
    data: {
      name: name.data,
      memberships: { create: { userId: user.id, role: "OWNER" } },
      // o criador entra como participante, ligado ao seu login
      members: { create: { name: user.name, userId: user.id, phone: user.phone } },
    },
  });
  await setActiveGroup(group.id);
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
