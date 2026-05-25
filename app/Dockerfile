FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci || npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runtime
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package.json .

ENV HOST=0.0.0.0
ENV PORT=4321
ENV DATABASE_URL=/app/data/envelopes.db
ENV JWT_SECRET=change-me-to-a-random-string
ENV ENVELOPES_USERNAME=admin
ENV ENVELOPES_PASSWORD=changeme

VOLUME ["/app/data"]
EXPOSE 4321

CMD ["node", "dist/server/entry.mjs"]
