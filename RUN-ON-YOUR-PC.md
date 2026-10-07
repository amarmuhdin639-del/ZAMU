# Run ZAMU on Your PC — Setup Guide

Your complete store in one zip: source code, database with all your products/orders, uploaded photos, payment methods, settings, and this guide.

## What's inside

- `src/` — the whole app (storefront + admin + APIs)
- `db/custom.db` — your live database (products, orders, customers, settings)
- `public/uploads/` + `uploads/` — every photo/video you uploaded + customer payment screenshots
- `prisma/schema.prisma` — database structure
- `.env` — database location (already portable, no editing needed)
- `worklog.md` — full history of everything we built, task by task

## Requirements (one-time)

1. Install **Node.js 20 or newer** → https://nodejs.org (LTS version is fine)
2. Install **Bun** (the runtime the store uses) → open Terminal (Mac/Linux) or PowerShell (Windows) and run:
   - Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`
   - Mac/Linux: `curl -fsSL https://bun.sh/install | bash`

## Start the store (every time)

Open a terminal IN the unzipped folder, then:

```
bun install
bun run db:generate
bun run dev
```

Then open **http://localhost:3000** in your browser. That's it.

- First `bun install` downloads dependencies (a few minutes, needs internet).
- Your admin login works the same as here.
- Your data (`db/custom.db`) already contains everything — nothing to re-import.

## Put it online for real (later)

When you want the store live 24/7 on your own domain, the two easiest paths:

1. **Vercel (recommended)** — free tier works. Push this folder to GitHub, import the repo at vercel.com, add a SQLite-friendly host or switch DATABASE_URL to a hosted Postgres. 
2. **A small VPS (Hetzner/DigitalOcean ~$5/mo)** — install Node + Bun, run `bun run build` then `bun run start`, put it behind Cloudflare.

Ask me when you get there — I'll walk you through it step by step.

## Troubleshooting

| Problem | Fix |
|---|---|
| `bun: command not found` | Close and reopen the terminal after installing Bun |
| Database errors on start | Run `bun run db:generate` once, then `bun run dev` again |
| Port 3000 busy | Change the port: edit the `dev` script in `package.json` to `-p 3001` |
| Photos missing after moving the folder | Keep the unzipped folder in ONE place — uploads are referenced relative to the project root |
