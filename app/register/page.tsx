"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction, type ActionState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default function RegisterPage() {
  const [state, action] = useActionState<ActionState, FormData>(registerAction, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Criar conta</h1>
        <p className="mb-5 text-sm text-slate-500">Depois crias ou entras num grupo de boleias</p>
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Nome</label>
            <input id="name" name="name" className="input" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="phone">Telemóvel (MB WAY) — opcional</label>
            <input id="phone" name="phone" inputMode="tel" className="input" placeholder="912345678" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" required minLength={6} />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton className="btn-primary w-full" pendingText="A criar…">Criar conta</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Já tens conta?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
