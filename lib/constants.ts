// Tipos de boleia e o seu peso/forma de pagamento.
export const RIDE_TYPES = {
  BOLEIA: { label: "Boleia", weight: 1, kind: "rides" as const },
  MEIA_BOLEIA: { label: "Meia Boleia", weight: 0.5, kind: "rides" as const },
  BOLEIA_EUR: { label: "Boleia €", weight: 1, kind: "euros" as const },
  MEIA_BOLEIA_EUR: { label: "Meia Boleia €", weight: 0.5, kind: "euros" as const },
} as const;

export type RideType = keyof typeof RIDE_TYPES;
export const RIDE_TYPE_KEYS = Object.keys(RIDE_TYPES) as RideType[];

export const PAYMENT_METHODS = {
  MBWAY: "MB WAY",
  TRANSFER: "Transferência",
  CASH: "Dinheiro",
  OTHER: "Outro",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;
export const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS) as PaymentMethod[];

export const ROLES = { OWNER: "Dono", MEMBER: "Membro" } as const;

export function eur(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export function rides(value: number): string {
  const n = Math.round(value * 100) / 100;
  return `${n} ${Math.abs(n) === 1 ? "boleia" : "boleias"}`;
}

export function formatDate(d: Date | string): string {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(new Date(d));
}
