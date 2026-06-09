# CLAUDE.md

Guia para o Claude Code (e humanos) trabalharem neste repositório.

## O que é

Aplicação web de **controlo de custos de boleias partilhadas**, substituta de uma folha
de Excel. Um grupo de pessoas dá boleias umas às outras; cada boleia gera uma dívida
(em "boleias" a devolver, ou em euros). Pagamentos abatem às dívidas em euros.
Tem autenticação, vários grupos, várias rotas e parâmetros de custo por rota (com
override por viagem).

## Stack

- **Next.js 15** (App Router, Server Components + Server Actions) + **TypeScript**
- **Prisma** + **PostgreSQL** (local via `docker compose up -d`; produção: Postgres
  externo — **Neon** — porque o free tier do Render só dá uma BD gerida por conta)
- **Auth.js (NextAuth v5)** — Credentials (email+password, bcrypt), sessão JWT, `trustHost`
- **Tailwind CSS** (sem dependência de UI externa)
- **Zod** para validação nas server actions

## Comandos

```bash
docker compose up -d   # Postgres local em :5432
npm install
npm run db:migrate     # aplica migrações (prisma migrate dev)
npm run db:seed        # popula com os dados do Excel original
npm run dev            # http://localhost:3000
npm run build          # prisma generate + next build
npm run db:reset       # apaga e recria a BD, depois corre o seed
npm run db:studio      # Prisma Studio
```

Deploy: Render Blueprint em [render.yaml](render.yaml) — ver [README.md](README.md).
O Blueprint **não provisiona** base de dados (free tier do Render limitado a uma BD por
conta). O `DATABASE_URL` é definido **manualmente** no dashboard do Render (Environment),
apontando para um Postgres externo gratuito (Neon/Supabase). As migrações são aplicadas no
arranque pelo `startCommand` (`prisma migrate deploy`); o seed é manual e corre uma vez.

Login demo (após seed): **demo@opt.pt** / **demo1234** (ligado ao membro "Márcio").

## Modelo de domínio

- **User**: login. **Group**: workspace partilhado. **Membership**: User↔Group.
- **Member**: participante do rateio. Pode ligar-se a um User (`userId`) = "eu" no grupo.
  `active=false` é **soft-delete**: o membro sai dos seletores de novas viagens/pagamentos
  mas mantém-se nos saldos/histórico e a dívida a ele continua saldável (ver regra abaixo).
- **Route**: parâmetros por defeito — `fuelPrice`, `totalKm`, `consumptionPer100`,
  `tolls`, `avgPeople`.
- **Trip** + **TripPassenger**: viagem (condutor + passageiros). Cada passageiro tem um
  `type`: `BOLEIA`, `MEIA_BOLEIA` (devolve em espécie) ou `BOLEIA_EUR`, `MEIA_BOLEIA_EUR`
  (devolve em euros). A viagem pode sobrepor os parâmetros da rota (campos nullable).
- **Payment**: pagamento entre membros (`method`: MBWAY/TRANSFER/CASH/OTHER). Abate à
  dívida em euros.
- **InitialBalance**: saldos de arranque por par ("Valores Iniciais" do Excel).

### Fórmula (de `lib/balances.ts`)

```
valorPorPessoa = ((consumo/100 × km) × precoCombustivel + portagens) / nºMédioPessoas
```
Passageiro fica em dívida com o condutor: `weight` boleias (tipos em espécie) ou
`weight × valorPorPessoa` euros (tipos €). `weight` = 1 (Boleia) ou 0,5 (Meia).
Pagamento `payer→payee` faz `owes(payer,payee).euros -= amount`.
Saldo líquido = `owes(a,b) − owes(b,a)` (+ saldos iniciais).

### Regra crítica — soft-delete

Nunca apagar Members nem os seus registos. "Remover" = `active=false`. O motor
(`lib/balances.ts`) **ignora** o flag `active` e usa todo o histórico, para que dívidas
a/de membros removidos continuem corretas e saldáveis.

## Estrutura

- `lib/balances.ts` — motor de cálculo (núcleo). `lib/session.ts` — utilizador/grupo
  ativo. `lib/auth*.ts` — Auth.js. `lib/db.ts` — Prisma. `lib/constants.ts` — tipos,
  rótulos e formatadores (€, datas em pt-PT).
- `app/(dash)/*` — páginas autenticadas (Resumo, Boleias, Pagamentos, Totais, Histórico,
  Rotas, Membros) com `app/(dash)/layout.tsx` (nav + troca de grupo).
- `app/actions/*` — server actions (`"use server"`), validadas com Zod, sempre limitadas
  ao grupo ativo (`requireContext`).
- `app/login`, `app/register`, `app/groups/new` — fora do layout autenticado.
- `prisma/seed.ts` lê `prisma/seed-data.json` (gerado por `tools/parse-xlsx.mjs` a partir
  do Excel original; o XML fonte está em `prisma/data/`).

## Convenções

- Toda a UI e textos em **português (pt-PT)**. Valores monetários via `eur()`.
- Mutações através de **server actions** + `revalidatePath`, nunca fetch a APIs próprias.
- Cada action revalida o grupo ativo e filtra por `groupId` (segurança multi-tenant).
