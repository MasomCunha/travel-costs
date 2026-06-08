import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type SeedData = {
  members: string[];
  routes: {
    name: string;
    fuelPrice: number;
    totalKm: number;
    consumptionPer100: number;
    tolls: number;
    avgPeople: number;
  }[];
  trips: { date: string; driver: string; passengers: { name: string; type: string }[] }[];
  payments: { date: string; payer: string; payee: string; amount: number; method: string }[];
};

async function main() {
  const data: SeedData = JSON.parse(
    readFileSync(join(process.cwd(), "prisma", "seed-data.json"), "utf8")
  );

  // Limpa tudo (idempotente)
  await prisma.tripPassenger.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.initialBalance.deleteMany();
  await prisma.route.deleteMany();
  await prisma.member.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // Utilizador de teste
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.create({
    data: { email: "demo@opt.pt", name: "Márcio (demo)", phone: "910000000", passwordHash },
  });

  // Grupo
  const group = await prisma.group.create({ data: { name: "Boleias OPT" } });
  await prisma.membership.create({
    data: { userId: user.id, groupId: group.id, role: "OWNER" },
  });

  // Membros
  const memberByName = new Map<string, string>();
  for (const name of data.members) {
    const m = await prisma.member.create({
      data: {
        groupId: group.id,
        name,
        // liga o login de teste ao participante "Márcio"
        userId: name === "Márcio" ? user.id : null,
        phone: name === "Márcio" ? "910000000" : null,
      },
    });
    memberByName.set(name, m.id);
  }

  // Rotas
  const routeByName = new Map<string, string>();
  for (const r of data.routes) {
    const route = await prisma.route.create({ data: { groupId: group.id, ...r } });
    routeByName.set(r.name, route.id);
  }
  const defaultRouteId = routeByName.values().next().value!;

  // Viagens
  for (const t of data.trips) {
    const driverId = memberByName.get(t.driver);
    if (!driverId) continue;
    await prisma.trip.create({
      data: {
        groupId: group.id,
        routeId: defaultRouteId,
        date: new Date(t.date),
        driverId,
        passengers: {
          create: t.passengers
            .filter((p) => memberByName.has(p.name))
            .map((p) => ({ passengerId: memberByName.get(p.name)!, type: p.type })),
        },
      },
    });
  }

  // Pagamentos
  for (const p of data.payments) {
    const payerId = memberByName.get(p.payer);
    const payeeId = memberByName.get(p.payee);
    if (!payerId || !payeeId) continue;
    await prisma.payment.create({
      data: {
        groupId: group.id,
        date: new Date(p.date),
        payerId,
        payeeId,
        amount: p.amount,
        method: p.method,
      },
    });
  }

  console.log(
    `Seed OK: utilizador demo@opt.pt / demo1234 · ${data.members.length} membros · ` +
      `${data.routes.length} rota(s) · ${data.trips.length} viagens · ${data.payments.length} pagamentos`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
