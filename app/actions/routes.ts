"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";

const num = z.coerce.number().nonnegative();
const routeSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  fuelPrice: num,
  totalKm: num,
  consumptionPer100: num,
  tolls: num,
  avgPeople: z.coerce.number().positive("Tem de ser > 0"),
});

function parse(formData: FormData) {
  return routeSchema.safeParse({
    name: formData.get("name"),
    fuelPrice: formData.get("fuelPrice"),
    totalKm: formData.get("totalKm"),
    consumptionPer100: formData.get("consumptionPer100"),
    tolls: formData.get("tolls"),
    avgPeople: formData.get("avgPeople"),
  });
}

export async function createRouteAction(formData: FormData) {
  const ctx = await requireContext();
  const parsed = parse(formData);
  if (!parsed.success) return;
  await prisma.route.create({ data: { groupId: ctx.group.id, ...parsed.data } });
  revalidatePath("/routes");
}

export async function updateRouteAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  const parsed = parse(formData);
  if (!parsed.success) return;
  await prisma.route.updateMany({ where: { id, groupId: ctx.group.id }, data: parsed.data });
  revalidatePath("/routes");
}

export async function deleteRouteAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  const used = await prisma.trip.count({ where: { routeId: id } });
  if (used > 0) return; // não apagar rotas com viagens associadas
  await prisma.route.deleteMany({ where: { id, groupId: ctx.group.id } });
  revalidatePath("/routes");
}
