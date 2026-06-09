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
    date: formData.get("date"),
    driverId: formData.get("driverId"),
    fuelPrice: formData.get("fuelPrice") ?? undefined,
    totalKm: formData.get("totalKm") ?? undefined,
    consumptionPer100: formData.get("consumptionPer100") ?? undefined,
    tolls: formData.get("tolls") ?? undefined,
    avgPeople: formData.get("avgPeople") ?? undefined,
  });
  if (!parsed.success) return;

  // valida que o condutor pertence ao grupo
  const driver = await prisma.member.findFirst({
    where: { id: parsed.data.driverId, groupId: ctx.group.id },
  });
  if (!driver) return;

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
      date: new Date(parsed.data.date),
      driverId: parsed.data.driverId,
      createdByUserId: ctx.user.id,
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
  // Só o criador da boleia a apaga; o dono do grupo pode apagar qualquer uma.
  const where =
    ctx.role === "OWNER"
      ? { id, groupId: ctx.group.id }
      : { id, groupId: ctx.group.id, createdByUserId: ctx.user.id };
  await prisma.trip.deleteMany({ where });
  revalidatePath("/trips");
  revalidatePath("/");
}
