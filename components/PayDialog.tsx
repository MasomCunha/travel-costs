"use client";

import { useState, useTransition } from "react";
import { createPaymentAction } from "@/app/actions/payments";
import { PAYMENT_METHODS, PAYMENT_METHOD_KEYS, eur } from "@/lib/constants";

type Payer = { id: string; name: string; owed: number };

export function PayDialog({
  payeeId,
  payeeName,
  payeePhone,
  payers,
  today,
}: {
  payeeId: string;
  payeeName: string;
  payeePhone: string | null;
  payers: Payer[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  // Por defeito sugere quem mais deve a este recebedor.
  const initial = [...payers].sort((a, b) => b.owed - a.owed)[0]?.id ?? "";
  const [payerId, setPayerId] = useState(initial);
  const [amount, setAmount] = useState(() => defaultAmount(payers, initial));

  if (payers.length === 0) return null;

  function onSelectPayer(id: string) {
    setPayerId(id);
    setAmount(defaultAmount(payers, id));
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      await createPaymentAction(formData);
      setOpen(false);
    });
  }

  return (
    <>
      <button className="btn-primary px-3 py-1 text-xs" onClick={() => setOpen(true)}>
        Pagar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !pending && setOpen(false)}
        >
          <div className="card w-full max-w-md text-left" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-semibold">Registar pagamento a {payeeName}</h3>
            {payeePhone && (
              <p className="mb-4 text-sm text-slate-500">
                MB WAY: <span className="font-medium text-slate-700">{payeePhone}</span>
              </p>
            )}

            <form action={submit} className="space-y-3">
              <input type="hidden" name="payeeId" value={payeeId} />

              <div>
                <label className="label">Quem paga</label>
                <select
                  name="payerId"
                  className="input"
                  value={payerId}
                  onChange={(e) => onSelectPayer(e.target.value)}
                  required
                >
                  {payers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (deve {eur(p.owed)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Valor €</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">Data</label>
                  <input name="date" type="date" defaultValue={today} className="input" required />
                </div>
              </div>

              <div>
                <label className="label">Método</label>
                <select name="method" className="input" defaultValue="MBWAY">
                  {PAYMENT_METHOD_KEYS.map((k) => (
                    <option key={k} value={k}>{PAYMENT_METHODS[k]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nota (opcional)</label>
                <input name="note" className="input" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  className="text-sm text-slate-500 hover:underline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  cancelar
                </button>
                <button className="btn-primary" type="submit" disabled={pending}>
                  {pending ? "A registar…" : "Confirmar pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function defaultAmount(payers: Payer[], payerId: string): string {
  const p = payers.find((x) => x.id === payerId);
  const v = Math.max(0, p?.owed ?? 0);
  return v > 0 ? String(v) : "";
}
