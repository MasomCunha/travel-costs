"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import { signIn, signOut } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Nome demasiado curto"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export type ActionState = { error?: string } | undefined;

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Já existe uma conta com este email." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: { name: parsed.data.name, email, phone: parsed.data.phone, passwordHash },
  });

  await signIn("credentials", {
    email,
    password: parsed.data.password,
    redirectTo: "/groups/new",
  });
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? "").toLowerCase(),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) return { error: "Email ou password incorretos." };
    throw err; // redireciona (NEXT_REDIRECT) tem de propagar
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
