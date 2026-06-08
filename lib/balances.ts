import "server-only";
import { prisma } from "@/lib/db";
import { RIDE_TYPES, type RideType } from "@/lib/constants";

// Parâmetros efetivos de uma viagem (override da viagem ?? default da rota).
export function tripValuePerPerson(trip: {
  fuelPrice: number | null;
  totalKm: number | null;
  consumptionPer100: number | null;
  tolls: number | null;
  avgPeople: number | null;
  route: { fuelPrice: number; totalKm: number; consumptionPer100: number; tolls: number; avgPeople: number };
}): number {
  const fuelPrice = trip.fuelPrice ?? trip.route.fuelPrice;
  const totalKm = trip.totalKm ?? trip.route.totalKm;
  const consumption = trip.consumptionPer100 ?? trip.route.consumptionPer100;
  const tolls = trip.tolls ?? trip.route.tolls;
  const avgPeople = trip.avgPeople ?? trip.route.avgPeople;
  if (!avgPeople) return 0;
  return ((consumption / 100) * totalKm * fuelPrice + tolls) / avgPeople;
}

export type MemberInfo = {
  id: string;
  name: string;
  phone: string | null;
  active: boolean;
};

export type Debt = { rides: number; euros: number };

// Resumo de uma contraparte na perspetiva de um membro.
// Positivo => o membro DEVE à contraparte; negativo => a contraparte deve ao membro.
export type CounterpartyBalance = {
  member: MemberInfo;
  rides: number;
  euros: number;
};

export type GroupBalances = {
  members: MemberInfo[];
  // owes[from][to] = quanto `from` deve a `to` (bruto, direcionado)
  owes: Map<string, Map<string, Debt>>;
  perMember: Map<
    string,
    { tripsAsDriver: number; tripsAsPassenger: number; paid: number; received: number }
  >;
};

function addOwe(owes: Map<string, Map<string, Debt>>, from: string, to: string, d: Partial<Debt>) {
  if (from === to) return;
  let inner = owes.get(from);
  if (!inner) owes.set(from, (inner = new Map()));
  const cur = inner.get(to) ?? { rides: 0, euros: 0 };
  cur.rides += d.rides ?? 0;
  cur.euros += d.euros ?? 0;
  inner.set(to, cur);
}

// Carrega o grupo e calcula todos os saldos direcionados.
export async function computeGroupBalances(groupId: string): Promise<GroupBalances> {
  const [members, trips, payments, initial] = await Promise.all([
    prisma.member.findMany({ where: { groupId }, orderBy: { name: "asc" } }),
    prisma.trip.findMany({
      where: { groupId },
      include: { route: true, passengers: true },
    }),
    prisma.payment.findMany({ where: { groupId } }),
    prisma.initialBalance.findMany({ where: { groupId } }),
  ]);

  const owes = new Map<string, Map<string, Debt>>();
  const perMember = new Map<
    string,
    { tripsAsDriver: number; tripsAsPassenger: number; paid: number; received: number }
  >();
  for (const m of members)
    perMember.set(m.id, { tripsAsDriver: 0, tripsAsPassenger: 0, paid: 0, received: 0 });

  // Saldos iniciais
  for (const ib of initial) addOwe(owes, ib.fromMemberId, ib.toMemberId, { rides: ib.rides, euros: ib.euros });

  // Viagens: o passageiro fica em dívida com o condutor.
  for (const trip of trips) {
    perMember.get(trip.driverId)?.tripsAsDriver !== undefined &&
      (perMember.get(trip.driverId)!.tripsAsDriver += 1);
    const value = tripValuePerPerson(trip);
    for (const p of trip.passengers) {
      const meta = RIDE_TYPES[p.type as RideType];
      if (!meta) continue;
      if (perMember.has(p.passengerId)) perMember.get(p.passengerId)!.tripsAsPassenger += 1;
      if (meta.kind === "rides") {
        addOwe(owes, p.passengerId, trip.driverId, { rides: meta.weight });
      } else {
        addOwe(owes, p.passengerId, trip.driverId, { euros: meta.weight * value });
      }
    }
  }

  // Pagamentos: abatem à dívida em euros do pagador ao recebedor.
  for (const pay of payments) {
    addOwe(owes, pay.payerId, pay.payeeId, { euros: -pay.amount });
    if (perMember.has(pay.payerId)) perMember.get(pay.payerId)!.paid += pay.amount;
    if (perMember.has(pay.payeeId)) perMember.get(pay.payeeId)!.received += pay.amount;
  }

  return {
    members: members.map((m) => ({ id: m.id, name: m.name, phone: m.phone, active: m.active })),
    owes,
    perMember,
  };
}

// Dívida líquida de `from` para `to` (compensa o sentido inverso).
export function netDebt(owes: Map<string, Map<string, Debt>>, from: string, to: string): Debt {
  const a = owes.get(from)?.get(to) ?? { rides: 0, euros: 0 };
  const b = owes.get(to)?.get(from) ?? { rides: 0, euros: 0 };
  return { rides: a.rides - b.rides, euros: a.euros - b.euros };
}

// Lista de contrapartes de um membro com saldo líquido (positivo => o membro deve).
export function counterpartiesFor(
  bal: GroupBalances,
  memberId: string,
  opts: { hideSettledInactive?: boolean } = {}
): CounterpartyBalance[] {
  const result: CounterpartyBalance[] = [];
  for (const other of bal.members) {
    if (other.id === memberId) continue;
    const net = netDebt(bal.owes, memberId, other.id);
    const settled = Math.abs(net.rides) < 1e-6 && Math.abs(net.euros) < 1e-6;
    if (settled && opts.hideSettledInactive && !other.active) continue;
    if (settled && !other.active) continue;
    result.push({ member: other, rides: round(net.rides), euros: round(net.euros) });
  }
  return result.sort((a, b) => b.euros - a.euros);
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
