"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Resumo", icon: "📊" },
  { href: "/trips", label: "Boleias", icon: "🚗" },
  { href: "/payments", label: "Pagamentos", icon: "💶" },
  { href: "/balances", label: "Totais", icon: "🧮" },
  { href: "/history", label: "Histórico", icon: "🕓" },
  { href: "/routes", label: "Rotas", icon: "🛣️" },
  { href: "/members", label: "Membros", icon: "👥" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span aria-hidden>{l.icon}</span>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
