"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { RIDE_TYPE_KEYS } from "@/lib/constants";

const optNum = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), "Valor inválido");

const tripSchema = z.object({
  routeId: z.string().min(1),
  date: z.string().min(1),
  driverId: z.string().min(1),
  fuelPrice: optNum,
  totalKm: optNum,
  consumptionPer100: optNum,
  tolls: optNum,
  avgPeople: optNum,
});

export async function createTripAction(formData: FormData) {
  const ctx = await requireContext();
  const parsed = tripSchema.safeParse({
    routeId: formData.get("routeId"),
    date: formData.get("date"),
    driverId: formData.get("driverId"),
    fuelPrice: formData.get("fuelPrice") ?? undefined,
    totalKm: formData.get("totalKm") ?? undefined,
    consumptionPer100: formData.get("consumptionPer100") ?? undefined,
    tolls: formData.get("tolls") ?? undefined,
    avgPeople: formData.get("avgPeople") ?? undefined,
  });
  if (!parsed.success) return;

  // valida que rota e condutor pertencem ao grupo
  const [route, driver] = await Promise.all([
    prisma.route.findFirst({ where: { id: parsed.data.routeId, groupId: ctx.group.id } }),
    prisma.member.findFirst({ where: { id: parsed.data.driverId, groupId: ctx.group.id } }),
  ]);
  if (!route || !driver) return;

  // passageiros: campos type_<memberId> com um tipo válido
  const groupMembers = await prisma.member.findMany({ where: { groupId: ctx.group.id } });
  const passengers: { passengerId: string; type: string }[] = [];
  for (const m of groupMembers) {
    if (m.id === parsed.data.driverId) continue;
    const type = String(formData.get(`type_${m.id}`) ?? "");
    if (RIDE_TYPE_KEYS.includes(type as never)) passengers.push({ passengerId: m.id, type });
  }
  if (passengers.length === 0) return; // uma viagem precisa de pelo menos um passageiro

  await prisma.trip.create({
    data: {
      groupId: ctx.group.id,
      routeId: parsed.data.routeId,
      date: new Date(parsed.data.date),
      driverId: parsed.data.driverId,
      fuelPrice: parsed.data.fuelPrice,
      totalKm: parsed.data.totalKm,
      consumptionPer100: parsed.data.consumptionPer100,
      tolls: parsed.data.tolls,
      avgPeople: parsed.data.avgPeople,
      passengers: { create: passengers },
    },
  });
  revalidatePath("/trips");
  revalidatePath("/");
}

export async function deleteTripAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  await prisma.trip.deleteMany({ where: { id, groupId: ctx.group.id } });
  revalidatePath("/trips");
  revalidatePath("/");
}
