FROM node:22 AS builder

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build
RUN npm prune --omit=dev


FROM node:22

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/assets ./assets
COPY package.json ./
COPY .env ./

EXPOSE 3333

CMD ["node", "dist/main.js"]