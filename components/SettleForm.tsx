"use client";

import { useState } from "react";
import { settleUpAction } from "@/app/actions/payments";
import { PAYMENT_METHODS, PAYMENT_METHOD_KEYS } from "@/lib/constants";

export function SettleForm({
  memberId,
  otherId,
  otherName,
  otherPhone,
}: {
  memberId: string;
  otherId: string;
  otherName: string;
  otherPhone: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn-primary px-3 py-1 text-xs" onClick={() => setOpen(true)}>
        Saldar
      </button>
    );
  }

  return (
    <form action={settleUpAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="otherId" value={otherId} />
      <select name="method" className="input w-auto py-1 text-xs" defaultValue="MBWAY">
        {PAYMENT_METHOD_KEYS.map((k) => (
          <option key={k} value={k}>
            {PAYMENT_METHODS[k]}
          </option>
        ))}
      </select>
      <button className="btn-primary px-3 py-1 text-xs" type="submit">
        Confirmar pagamento a {otherName}
      </button>
      <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => setOpen(false)}>
        cancelar
      </button>
      {otherPhone && (
        <span className="text-xs text-slate-400">MB WAY: {otherPhone}</span>
      )}
    </form>
  );
}
