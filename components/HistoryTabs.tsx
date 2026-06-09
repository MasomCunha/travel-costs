"use client";

import { useState } from "react";

export function HistoryTabs({
  general,
  payments,
}: {
  general: React.ReactNode;
  payments: React.ReactNode;
}) {
  const [tab, setTab] = useState<"geral" | "pagamentos">("geral");

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${
      active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={tabClass(tab === "geral")} onClick={() => setTab("geral")}>
          Histórico geral
        </button>
        <button className={tabClass(tab === "pagamentos")} onClick={() => setTab("pagamentos")}>
          Pagamentos
        </button>
      </div>

      <div className={tab === "geral" ? "" : "hidden"}>{general}</div>
      <div className={tab === "pagamentos" ? "" : "hidden"}>{payments}</div>
    </div>
  );
}
