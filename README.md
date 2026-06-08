# Travel Costs — Controlo de Custos de Boleias

Aplicação web para gerir os custos de boleias partilhadas de um grupo: regista quem deu
boleia a quem, calcula automaticamente quanto cada um deve (em boleias a devolver ou em
euros) e abate os pagamentos. Substitui a antiga folha de Excel.

Funcionalidades: autenticação, vários grupos, várias rotas com parâmetros de custo
(combustível/km/portagens/pessoas) por rota e ajustáveis por viagem, resumo "o que devo /
quem me deve", botão **Saldar**, histórico e remoção de membros sem perder contas antigas.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma · PostgreSQL · Auth.js (NextAuth v5) · Tailwind.

## Desenvolvimento local

```bash
docker compose up -d          # Postgres local em :5432
cp .env.example .env          # e gerar AUTH_SECRET: npx auth secret
npm install
npm run db:migrate            # aplica as migrações
npm run db:seed               # importa os dados do Excel original (opcional)
npm run dev                   # http://localhost:3000
```

Login demo (após o seed): **demo@opt.pt** / **demo1234**.

## Deploy no Render

O repositório inclui [`render.yaml`](render.yaml) (Blueprint).

1. Faz push deste repo para o GitHub.
2. No [Render](https://dashboard.render.com): **New +** → **Blueprint** → escolhe o repo.
3. O Render cria o **Postgres** + o **serviço web** e liga o `DATABASE_URL`
   automaticamente. O `AUTH_SECRET` é gerado pelo Render.
4. No primeiro deploy, o `startCommand` corre `prisma migrate deploy` (cria as tabelas).
5. **Seed (opcional, uma vez):** na shell do serviço web no Render, corre `npm run db:seed`
   para popular com os dados de exemplo. (Não corre automaticamente para não apagar dados.)

Variáveis de ambiente usadas: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST=true`.

Mais detalhes de arquitetura em [CLAUDE.md](CLAUDE.md).
