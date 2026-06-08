"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type ActionState } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  const [state, action] = useActionState<ActionState, FormData>(loginAction, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
        <p className="mb-5 text-sm text-slate-500">Controlo de custos de boleias</p>
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" required autoFocus />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" required />
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton className="btn-primary w-full" pendingText="A entrar…">Entrar</SubmitButton>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Sem conta?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Criar conta
          </Link>
        </p>
        <p className="mt-3 rounded-lg bg-slate-50 p-2 text-center text-xs text-slate-400">
          Demo: demo@opt.pt / demo1234
        </p>
      </div>
    </main>
  );
}
