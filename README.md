# HLUSCA

HLUSCA is a role-based cooperative management application for member enrollment,
savings accounts, and auditable financial operations.

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local` with the required application and Neon PostgreSQL variables:

```env
DATABASE_URL=
DATABASE_URL_UNPOOLED=
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=
```

Generate the Prisma client, then apply all committed migrations **before** starting
the application. This creates the `hlusca` schema and the savings ledger tables the
member dashboard depends on.

```bash
npm run db:generate
npx prisma migrate deploy
```

Seed core system settings and create the development administrator when needed:

```bash
npm run db:seed
npm run bootstrap:admin
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Commands

Run this in every environment after pulling new migrations, including production:

```bash
npx prisma migrate deploy
```

Use `npm run db:migrate` only while authoring a new migration locally. Do not use it
as the production deployment command.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
```

## Deployment

Set the required environment variables in the deployment environment, then run the
same migration command before serving the new application build:

```bash
npx prisma migrate deploy
npm run build
npm run start
```
