import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const WEIGHT = { BOLEIA: 1, MEIA_BOLEIA: 0.5, BOLEIA_EUR: 1, MEIA_BOLEIA_EUR: 0.5 };
const KIND = { BOLEIA: "rides", MEIA_BOLEIA: "rides", BOLEIA_EUR: "euros", MEIA_BOLEIA_EUR: "euros" };

function valuePerPerson(t) {
  const fp = t.fuelPrice ?? t.route.fuelPrice;
  const km = t.totalKm ?? t.route.totalKm;
  const c = t.consumptionPer100 ?? t.route.consumptionPer100;
  const to = t.tolls ?? t.route.tolls;
  const ap = t.avgPeople ?? t.route.avgPeople;
  return ap ? ((c / 100) * km * fp + to) / ap : 0;
}

const members = await prisma.member.findMany();
const id2name = Object.fromEntries(members.map((m) => [m.id, m.name]));
const trips = await prisma.trip.findMany({ include: { route: true, passengers: true } });
const payments = await prisma.payment.findMany();

const owes = {}; // owes[from][to] = {rides, euros}
const add = (f, t, d) => {
  if (f === t) return;
  owes[f] ??= {};
  owes[f][t] ??= { rides: 0, euros: 0 };
  owes[f][t].rides += d.rides ?? 0;
  owes[f][t].euros += d.euros ?? 0;
};
for (const t of trips) {
  const v = valuePerPerson(t);
  for (const p of t.passengers) {
    if (KIND[p.type] === "rides") add(p.passengerId, t.driverId, { rides: WEIGHT[p.type] });
    else add(p.passengerId, t.driverId, { euros: WEIGHT[p.type] * v });
  }
}
for (const p of payments) add(p.payerId, p.payeeId, { euros: -p.amount });

const net = (a, b) => ({
  rides: (owes[a]?.[b]?.rides ?? 0) - (owes[b]?.[a]?.rides ?? 0),
  euros: (owes[a]?.[b]?.euros ?? 0) - (owes[b]?.[a]?.euros ?? 0),
});

// Consistência: soma de todas as dívidas líquidas em euros deve ser ~0
let sumEuros = 0;
for (const a of members) for (const b of members) if (a.id < b.id) sumEuros += net(a.id, b.id).euros;
console.log("Conservação (soma líquida euros entre todos os pares, deve ~0):", sumEuros.toFixed(6));

// Resumo por membro
console.log("\nSaldo líquido em euros por membro (positivo = deve; negativo = é credor):");
for (const m of members) {
  let total = 0;
  for (const o of members) if (o.id !== m.id) total += net(m.id, o.id).euros;
  console.log(`  ${m.name.padEnd(10)} ${total >= 0 ? "deve" : "a receber"} ${Math.abs(total).toFixed(2)} €`);
}

await prisma.$disconnect();
