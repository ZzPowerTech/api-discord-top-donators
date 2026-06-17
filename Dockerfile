# ---- Builder ----
FROM node:22-slim AS builder

WORKDIR /usr/src/app

# Instalacao deterministica a partir do lockfile.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

# ---- Runtime ----
FROM node:22-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production

# libfontconfig1: necessaria para o @napi-rs/canvas resolver fontes de fallback.
# node:22-slim ja inclui full-icu (locale pt-BR para os nomes de mes).
RUN apt-get update \
  && apt-get install -y --no-install-recommends libfontconfig1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/assets ./assets
COPY package.json ./

# Executa como usuario nao-root.
USER node

EXPOSE 3333

# Liveness pelo endpoint /health; o deploy aguarda o container ficar "healthy".
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3333/health',(r)=>process.exit(r.statusCode<400?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
