# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão Geral

API NestJS que automatiza, para o servidor de Minecraft AUSTV, duas tarefas agendadas:

1. **Top 3 Doadores** — todo dia 1º do mês às 00:00 (`America/Sao_Paulo`), busca os maiores clientes do mês anterior na API Central Cart, gera uma imagem PNG com as skins 3D dos jogadores e publica via webhook do Discord.
2. **Monitor de Posts do Blog** — a cada 5 minutos, consulta novos posts da webstore e publica notificações no Discord.

Não há banco de dados. O estado do monitor de posts (`lastCheckedPostId`) vive **em memória** — reiniciar o container reinicializa o ponto de partida em `onModuleInit`.

## Comandos

```bash
npm run start:dev      # desenvolvimento com watch
npm run start          # execução simples
npm run build          # compila para dist/ (nest build)
npm run start:prod     # roda o build (node dist/main)

npm run lint           # eslint --fix em src/, test/
npm run format         # prettier --write

npm test               # testes unitários (jest, arquivos *.spec.ts em src/)
npm run test:watch     # jest --watch
npm run test:cov       # cobertura
npm run test:e2e       # testes e2e (config em test/jest-e2e.json)

# Rodar um único teste
npx jest src/app.controller.spec.ts
npx jest -t "nome do teste"
```

A app sobe na porta `PORT` ou `3333` (default). Variáveis de ambiente vêm de `.env` (template em `.env.example`).

## Arquitetura

Fluxo de dependência entre módulos (todos registrados em `src/app.module.ts`):

```
SchedulerModule  ──▶ CentralCartApiModule  (busca dados: top customers + posts)
                 ──▶ DiscordModule          (envio via webhook)
                 ──▶ ImageGeneratorModule   (geração de PNG)

WebhookModule    ──▶ DiscordModule          (recebe webhook externo → Discord)
```

- **`SchedulerModule`** é o orquestrador. Contém dois serviços com `@Cron`:
  - `scheduler.service.ts` → `sendMonthlyTopDonators()` (`@Cron('0 0 1 * *')`). Pega top 3, gera imagem, monta embed, envia.
  - `posts-monitor.service.ts` → `checkNewPosts()` (`@Cron('*/5 * * * *')`). Compara IDs de posts contra `lastCheckedPostId` para detectar novos.
  - **Importante:** `ScheduleModule.forRoot()` é importado aqui, **não** no `AppModule`.

- **`CentralCartApiModule`** — única camada que fala com a API Central Cart (via `@nestjs/axios`/`HttpService`). Pontos sutis:
  - `spent` chega como string BRL (`"R$ 1.139,99"`); `convertBRLToNumber()` converte para número.
  - `getPosts()` tolera dois formatos de resposta (array direto ou `{ data: [] }`) e **nunca lança** — retorna `[]` em erro.
  - Requer header `x-store-domain` nas chamadas de posts.

- **`ImageGeneratorModule`** — pipeline de canvas (`@napi-rs/canvas`) dividido em serviços:
  - `image-generator.service.ts` orquestra (background → título → players → footer) e salva em `temp/top-donators.png`.
  - `minecraft-skin.service.ts` resolve a skin com **cadeia de fallback**: Mojang (UUID) → Crafatar → Visage → Steve → buffer vazio. Nunca falha a geração por causa de skin.
  - Pódio é renderizado na ordem visual `[2º, 1º, 3º]`; posições faltantes viram placeholders `N/A`.
  - Fontes (`MinecraftTen`, `Monocraft`) e logo são lidas de `assets/` — **esse diretório é copiado para a imagem Docker** e precisa existir em runtime.

- **`DiscordModule`** — envia para o Discord por **webhooks HTTP** (não usa bot client). Dois fluxos:
  - `sendImageWithEmbed()` — upload multipart (`form-data`) com `attachment://top-donators.png`.
  - `sendPostUpdate()` — embed com link do post. A construção do link prioriza `post.path` da API; fallbacks derivam de `slug` + `created_at` (em UTC). Usa `DISCORD_UPDATES_WEBHOOK_URL`, caindo para `DISCORD_WEBHOOK_URL`.

- **`config/config.ts`** — todo acesso a env é centralizado via **getters** (avaliados em tempo de chamada, não no boot). Sempre leia config por aqui em vez de `process.env` direto.

## Endpoints

Os caminhos reais divergem do README em alguns pontos — confie no código:

- `POST /scheduler/send-top-donators` — dispara o ranking mensal manualmente.
- `POST /scheduler/send-top-donators-custom` — body `{ from, to, monthName? }` (datas `YYYY-MM-DD`).
- `POST /scheduler/send-latest-post` — reenvia o post mais recente.
- `POST /scheduler/check-new-posts` — força a verificação de novos posts.
- `GET  /scheduler/test-posts-api?storeId=` — debug da API de posts.
- `GET  /central-cart-api/top-customers?from=&to=`
- `GET  /central-cart-api/top-customers/previous-month`
- `POST /webhook/centralcart/post-created` — webhook externo da Central Cart.
- `POST /webhook/test` — teste manual de post no Discord.

## CI/CD

`.github/workflows/release-deploy.yml` roda em push para `main`:

1. **Versionamento por Conventional Commits** — `BREAKING CHANGE`/`!:` → major, `feat:` → minor, `fix:`/default → patch. Cria tag `vX.Y.Z` e GitHub Release. Dá para forçar o bump via `workflow_dispatch`.
2. **Docker** — build/push para `zzpowertech/api-site:<versão>` e `:latest`.
3. **Deploy** — SSH na VPS, reescreve a linha `image:` do compose com a nova versão, `docker stop/rm` + `docker compose pull/up -d`.

Mensagens de commit seguem Conventional Commits (com emojis nos commits recentes) e **afetam diretamente a versão publicada** — escreva-as com cuidado.

## Convenções

- Prettier: aspas simples e trailing commas (`.prettierrc`).
- Logs via `Logger` do NestJS, um por serviço, mensagens em português.
- Serviços tratam erros e logam; os de scheduler engolem exceções para não derrubar o cron, enquanto os métodos manuais relançam.
