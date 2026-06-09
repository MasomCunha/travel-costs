"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { groupParamsSchema } from "@/lib/groupParams";

// Atualiza os parâmetros de custo do grupo ativo (a "rota" do grupo).
export async function updateGroupParamsAction(formData: FormData) {
  const ctx = await requireContext();
  if (ctx.role !== "OWNER") return; // só o dono do grupo edita os parâmetros
  const parsed = groupParamsSchema.safeParse({
    fuelPrice: formData.get("fuelPrice"),
    totalKm: formData.get("totalKm"),
    consumptionPer100: formData.get("consumptionPer100"),
    tolls: formData.get("tolls"),
    avgPeople: formData.get("avgPeople"),
  });
  if (!parsed.success) return;
  await prisma.group.update({ where: { id: ctx.group.id }, data: parsed.data });
  revalidatePath("/routes");
  revalidatePath("/");
}
