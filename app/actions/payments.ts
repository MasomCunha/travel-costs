"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireContext } from "@/lib/session";
import { PAYMENT_METHOD_KEYS } from "@/lib/constants";
import { computeGroupBalances, netDebt } from "@/lib/balances";

const paymentSchema = z.object({
  date: z.string().min(1),
  payerId: z.string().min(1),
  payeeId: z.string().min(1),
  amount: z.coerce.number().positive("Valor tem de ser > 0"),
  method: z.enum(PAYMENT_METHOD_KEYS as [string, ...string[]]),
  note: z.string().trim().optional(),
});

export async function createPaymentAction(formData: FormData) {
  const ctx = await requireContext();
  const parsed = paymentSchema.safeParse({
    date: formData.get("date"),
    payerId: formData.get("payerId"),
    payeeId: formData.get("payeeId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success || parsed.data.payerId === parsed.data.payeeId) return;

  await prisma.payment.create({
    data: {
      groupId: ctx.group.id,
      date: new Date(parsed.data.date),
      payerId: parsed.data.payerId,
      payeeId: parsed.data.payeeId,
      amount: parsed.data.amount,
      method: parsed.data.method,
      note: parsed.data.note || null,
    },
  });
  revalidatePath("/balances");
  revalidatePath("/history");
  revalidatePath("/");
}

// "Saldar": cria um pagamento que zera a dívida líquida em euros entre dois membros.
export async function settleUpAction(formData: FormData) {
  const ctx = await requireContext();
  const meId = String(formData.get("memberId"));
  const otherId = String(formData.get("otherId"));
  const method = String(formData.get("method") || "MBWAY");
  if (meId === otherId) return;

  const bal = await computeGroupBalances(ctx.group.id);
  const net = netDebt(bal.owes, meId, otherId); // positivo => `me` deve a `other`
  const amount = Math.round(Math.abs(net.euros) * 100) / 100;
  if (amount <= 0) return; // nada a saldar em euros

  const payerId = net.euros > 0 ? meId : otherId;
  const payeeId = net.euros > 0 ? otherId : meId;

  await prisma.payment.create({
    data: {
      groupId: ctx.group.id,
      date: new Date(),
      payerId,
      payeeId,
      amount,
      method: PAYMENT_METHOD_KEYS.includes(method as never) ? method : "OTHER",
      note: "Saldo de conta",
    },
  });
  revalidatePath("/");
  revalidatePath("/balances");
  revalidatePath("/history");
}

export async function deletePaymentAction(formData: FormData) {
  const ctx = await requireContext();
  const id = String(formData.get("id"));
  await prisma.payment.deleteMany({ where: { id, groupId: ctx.group.id } });
  revalidatePath("/balances");
  revalidatePath("/history");
  revalidatePath("/");
}
