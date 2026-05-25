# Envelopes

A beautiful, self-hosted envelope budgeting app inspired by [YNAB](https://www.ynab.com/) and [Monarch](https://www.monarch.com/). Take control of your finances without subscriptions or data sharing.

## Features

- **Envelope Budgeting** — Give every dollar a job with monthly category assignments
- **Dashboard** — See your complete financial picture with charts and insights
- **Multiple Account Types** — Checking, savings, credit cards, loans, investments, CDs, retirement
- **Transaction Tracking** — Log income and expenses with categories and payees
- **Income vs Expenses** — Monthly comparison with net savings tracking
- **Net Worth** — Track assets vs liabilities over time
- **Self-Hosted** — Your data stays on your server. No third-party access.
- **Docker Ready** — One command to deploy anywhere Docker runs

## Quick Start

```bash
# Clone the repo
git clone https://github.com/kevin-wynn/envelopes.git
cd envelopes/app

# Copy and edit environment variables
cp .env.example .env

# Start with Docker
docker compose up -d
```

Open `http://localhost:4321` and log in with your configured credentials.

## Docker Compose

```yaml
version: '3.8'

services:
  envelopes:
    image: lukevinskywynn/envelopes:latest
    container_name: envelopes
    restart: unless-stopped
    ports:
      - "4321:4321"
    environment:
      - JWT_SECRET=your-random-secret-here
      - ENVELOPES_USERNAME=admin
      - ENVELOPES_PASSWORD=your-secure-password
    volumes:
      - envelopes_data:/app/data

volumes:
  envelopes_data:
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | Secret for signing auth tokens (required) |
| `ENVELOPES_USERNAME` | `admin` | Login username |
| `ENVELOPES_PASSWORD` | `changeme` | Login password (hashed with bcrypt on startup) |
| `DATABASE_URL` | `/app/data/envelopes.db` | Path to SQLite database file |

## Tech Stack

- **Frontend** — Astro, React, Tailwind CSS, Recharts
- **Backend** — Astro SSR (Node adapter), Drizzle ORM
- **Database** — SQLite (via better-sqlite3)
- **Auth** — bcryptjs, JWT (HTTP-only cookies)
- **Deployment** — Docker

## Project Structure

```
envelopes/
├── app/                    # Main application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── db/             # Database schema and init
│   │   ├── layouts/        # Astro layouts
│   │   ├── lib/            # Auth, utils
│   │   ├── pages/          # Astro pages and API routes
│   │   └── styles/         # Global CSS
│   ├── Dockerfile
│   └── docker-compose.yml
├── marketing/              # Marketing site (static Astro)
└── README.md
```

## Development

```bash
cd app
npm install
npm run dev
```

The app runs at `http://localhost:4321`.

## License

MIT
