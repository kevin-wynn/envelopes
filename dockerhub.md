# Envelopes

**Self-hosted envelope budgeting inspired by YNAB and Monarch.** Take full control of your finances — no subscriptions, no data sharing, runs entirely on your own hardware.

---

## Quick Start

```yaml
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

Open `http://your-server:4321` and log in with the credentials you set above.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | Secret for signing auth tokens **(required)** |
| `ENVELOPES_USERNAME` | `admin` | Login username |
| `ENVELOPES_PASSWORD` | `changeme` | Login password (bcrypt-hashed on first startup) |
| `DATABASE_URL` | `/app/data/envelopes.db` | Path to the SQLite database file |

> **Tip:** Mount the `/app/data` volume to persist your database across container restarts and updates.

---

## Features

- **Envelope Budgeting** — Give every dollar a job. Assign income to categories each month.
- **Dashboard** — Net worth, assets, liabilities, monthly savings at a glance.
- **All Account Types** — Checking, savings, credit cards, mortgages, auto loans, investments, CDs, retirement.
- **Transaction Tracking** — Log income and expenses with categories and payees.
- **Income vs Expenses** — Monthly trend chart with net savings tracking.
- **100% Private** — Your data never leaves your server.

---

## Updating

```bash
docker pull lukevinskywynn/envelopes:latest
docker compose up -d
```

Data is stored in the named volume and persists across updates.

---

## Source & Issues

GitHub: [github.com/kevin-wynn/envelopes](https://github.com/kevin-wynn/envelopes)

MIT License
