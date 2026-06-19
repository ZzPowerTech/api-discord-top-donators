# Cargos do Discord por meta de doação acumulada — Design

- **Data:** 2026-06-18
- **Autor:** Murilo (AusTV) + Claude Code
- **Status:** Aprovado (2026-06-18) — inclui requisito de hardening de segurança das rotas. Bot do Discord já criado.
- **Projeto:** `api-discord-top-donators` (NestJS 11)

## 1. Objetivo

Quando um membro atinge um valor **acumulado** de doações no servidor AusTV, ele recebe
automaticamente um **cargo no Discord** correspondente à meta e uma **notificação por DM**
avisando que atingiu a meta e ganhou o cargo.

Metas e cargos (substitutivos — só o cargo do tier mais alto atingido fica ativo):

| Tier | Meta (acumulado líquido) | Role ID do Discord |
|------|--------------------------|--------------------|
| 1    | R$ 60                    | `1517021451406938122` |
| 2    | R$ 180                   | `1517021366367293571` |
| 3    | R$ 500                   | `1517021393873534996` |

## 2. Decisões tomadas (brainstorming)

| Tema | Decisão |
|------|---------|
| Vínculo doador → Discord | Campo `client_discord` (ID numérico/snowflake) presente nos dados da ordem da Central Cart. |
| Fonte do acumulado | Endpoint `GET /v1/app/user_spent` da Central Cart (fonte de verdade — **não** somamos localmente). |
| Valor que conta | `total_net_received` (líquido). |
| Comportamento dos cargos | **Substitutivo (tier)**: ao subir, remove o cargo do tier anterior e adiciona o novo. |
| Gatilho | **Webhook `ORDER_APPROVED`** da Central Cart (reativo). |
| Persistência | **Nenhuma (stateless)**. O registro do tier atual é inferido dos cargos que o membro já possui no Discord. |
| Idempotência | Garantida pelo estado do Discord: se o membro já tem o cargo do tier-alvo, nada é feito (nem DM). |
| Histórico / "quem já doou" | Sem backfill automático. Endpoint admin de **sync manual** (`POST /donations/sync`) aplica o tier de uma pessoa sob demanda. |
| Reembolso/chargeback | **Fora do MVP.** Só reagimos a `ORDER_APPROVED`. Rebaixamento de cargo fica como extensão futura. |
| DM em pulo de tiers | **Uma única DM**, a do tier final atingido. Sem DMs intermediárias. |

## 3. Fluxo

```
Central Cart ──(POST webhook: event=ORDER_APPROVED)──▶ POST /webhook/centralcart/order
                                                              │
                                            [CentralCartHmacGuard: HMAC-SHA256 + rawBody]
                                                              │
                                      valida DTO { id, event, date, data }
                                                              │
                                  event === 'ORDER_APPROVED' && data.client_discord ?
                                                              │ sim
                       GET /v1/app/user_spent?email=<client_email | client_identifier>
                                                              │
                                       total = resposta.total_net_received
                                                              │
                              targetTier = maior tier cujo threshold <= total
                                                              │
                       GET guildMember(guildId, client_discord) → roles[] do membro
                                                              │
                          currentTier = maior tier cujo roleId ∈ roles[]
                                                              │
                              targetTier > currentTier ?
                                  │ sim                              │ não
        remove role(currentTier) se currentTier>0           nada (idempotente, sem DM)
        add role(targetTier)
        envia DM (embed do tier final)
```

Erros do Discord (DM bloqueada, membro fora do servidor, rate limit) **não desfazem** o que já
foi aplicado e **não derrubam** o webhook — são logados. O webhook sempre responde `200` rápido
quando a assinatura é válida (processamento dos efeitos é resiliente a falhas parciais).

## 4. Componentes

### 4.1 `CentralCartApiService` (estender)
Novo método:
```ts
getUserSpent(query: { email?: string; identifier?: string }): Promise<{ totalNetReceived: number; totalGrossReceived: number }>
```
- Chama `GET ${apiUrl}/app/user_spent` com `params` `email` **ou** `client_identifier`, header `Authorization: Bearer <token>`.
- Resposta crua: `{ total_net_received: number, total_gross_received: number }` (já numérico — **não** passa por `parseBRL`).
- Em erro: **lança** (diferente de `getPosts`), porque sem o total não há como decidir o tier; o chamador (orquestrador) captura e loga.
- DTO novo: `src/central-cart-api/dto/user-spent.dto.ts`.

### 4.2 `DiscordBotService` (novo, em `DiscordModule`)
Usa `@discordjs/rest` (`REST`) + `Routes` de `discord-api-types/v10`. Token: `config.discord.botToken`.
Instância única do `REST` (`new REST({ version: '10' }).setToken(token)`), criada de forma preguiçosa/no construtor.

```ts
getMemberRoleIds(userId: string): Promise<string[] | null>   // GET Routes.guildMember(guildId, userId); null se 404 (não está no servidor)
addRole(userId: string, roleId: string): Promise<void>       // PUT Routes.guildMemberRole(guildId, userId, roleId)
removeRole(userId: string, roleId: string): Promise<void>    // DELETE Routes.guildMemberRole(...)
sendDirectMessage(userId: string, embed: APIEmbed): Promise<void> // POST Routes.userChannels {recipient_id} → POST Routes.channelMessages(dm.id) {embeds}
```
- `guildId` vem de `config.discord.guildId`.
- `@discordjs/rest` já trata rate limit/retry e auth `Bot <token>`.
- Os webhooks atuais (`sendImageWithEmbed`, `sendPostUpdate`) permanecem **intactos** no `DiscordService`.

### 4.3 `DonationTierService` (novo, lógica pura — sem I/O)
```ts
readonly tiers: Array<{ tier: number; threshold: number; roleId: string; label: string }>; // de config
resolveTier(totalNet: number): number;                 // maior tier com threshold <= total (0 = nenhum)
resolveCurrentTier(memberRoleIds: string[]): number;   // maior tier cujo roleId está presente
roleIdForTier(tier: number): string | null;
```
Totalmente testável isolada. É o coração da regra de negócio.

### 4.4 `DonationRolesService` (novo, orquestrador)
```ts
applyForDiscordUser(input: { discordId: string; email?: string; identifier?: string }): Promise<DonationSyncResult>
```
Passos:
1. `total = (await centralCart.getUserSpent({email|identifier})).totalNetReceived`
2. `targetTier = tierService.resolveTier(total)`; se `0` → nada a fazer.
3. `roleIds = await discordBot.getMemberRoleIds(discordId)`; se `null` (fora do servidor) → loga e encerra.
4. `currentTier = tierService.resolveCurrentTier(roleIds)`
5. Se `targetTier <= currentTier` → nada (idempotente).
6. Senão: se `currentTier > 0` → `removeRole(discordId, roleIdForTier(currentTier))`; `addRole(discordId, roleIdForTier(targetTier))`; `sendDirectMessage(...)` (try/catch isolado — falha de DM não impede o cargo).
- Erros de cada etapa são capturados e logados; o método **nunca lança** quando chamado pelo webhook (resiliência), mas **retorna** um resultado estruturado para o endpoint admin.

### 4.5 `WebhookModule` (estender)
- Novo endpoint: `POST /webhook/centralcart/order` protegido por `CentralCartHmacGuard`.
- Valida `CentralCartOrderWebhookDto`. Se `event === 'ORDER_APPROVED'` e `data.client_discord` presente → chama `DonationRolesService.applyForDiscordUser`. Outros eventos: responde `200` e ignora (no-op).
- `WebhookModule` passa a importar `DonationRolesModule` (que exporta `DonationRolesService`). O acesso ao `getUserSpent` fica encapsulado dentro do `DonationRolesService`, então o `WebhookModule` não precisa conhecer `CentralCartApiModule` diretamente.

### 4.6 Endpoint admin de sync manual
- `POST /donations/sync` (no `DonationRolesController`, protegido por `ApiKeyGuard`).
- Body `SyncDonationDto`: `{ discordId: string; email?: string; identifier?: string }` (ao menos um entre email/identifier).
- Chama `DonationRolesService.applyForDiscordUser` e retorna o `DonationSyncResult` (total, tier anterior, tier novo, ações executadas).
- Resolve o caso "quem já doou" e correções pontuais, sem banco.

## 5. Contratos

### 5.1 Webhook de entrada (`POST /webhook/centralcart/order`)
Payload (formato padronizado da Central Cart):
```json
{
  "id": "abc123xyz",
  "event": "ORDER_APPROVED",
  "date": "2026-02-20T15:30:00.000Z",
  "data": {
    "client_identifier": "CelestAguiar",
    "client_email": "celest.vtuber@gmail.com",
    "client_discord": "1092929886408155188",
    "net_received": 95.82,
    "status": "APPROVED",
    "internal_id": "5FXAX7y_w44H"
  }
}
```
`CentralCartOrderWebhookDto` valida `id`, `event`, `date` e `data` (objeto aninhado; campos de
`data` validados com os relevantes opcionais, pois o payload completo tem muitos campos). O `data`
contém os mesmos campos da API de detalhes do pedido.

Headers de segurança: `x-centralcart-signature` (hex HMAC-SHA256), `x-centralcart-timestamp` (Unix).

### 5.2 `GET /v1/app/user_spent` (Central Cart, saída)
`?email=<email>` ou `?client_identifier=<nick>` → `{ "total_net_received": 240, "total_gross_received": 250 }`.

### 5.3 DM enviada ao membro
Embed: título "🎉 Meta de doação atingida!", descrição parabenizando, citando o **valor do tier**
(R$ 60 / 180 / 500) e o **nome do cargo** desbloqueado, cor por tier. Mensagem em português.

## 6. Segurança

**Princípio (requisito do Murilo): nenhuma rota sem proteção, fail-secure por padrão.** Nenhuma rota
pode permitir, se vazar, consultar recebimentos/valores da loja ou disparar ações privilegiadas
(conceder cargos, mexer em doadores). Toda rota nova nasce com guard; rotas existentes que expõem
recebimentos passam a ser protegidas também (defense-in-depth).

### 6.1 Matriz de proteção de rotas

| Rota | Tipo | Guard | Modo de falha |
|------|------|-------|---------------|
| `POST /webhook/centralcart/order` | Webhook (novo) | `CentralCartHmacGuard` | **Fail-secure**: sem secret → bloqueia; assinatura/timestamp inválidos → 401 |
| `POST /donations/sync` | Admin (novo) | `ApiKeyGuard` | Fail-secure (503 sem `SCHEDULER_API_KEY`; 401 inválida) |
| `GET /donations/:discordId` *(se exposto)* | Admin/leitura (novo) | `ApiKeyGuard` | Fail-secure |
| `GET /central-cart-api/top-customers` | **Existente, hoje SEM auth** | **Adicionar `ApiKeyGuard`** | Fail-secure — expõe quem gastou e quanto (recebimentos) |
| `GET /central-cart-api/top-customers/previous-month` | **Existente, hoje SEM auth** | **Adicionar `ApiKeyGuard`** | Fail-secure — idem acima |

> **Mudança de comportamento:** as duas rotas de `top-customers` passarão a **exigir** `x-api-key`.
> Elas não são usadas pelo cron (que chama o service direto), então o ranking mensal automático
> não é afetado. Quem consumir essas rotas manualmente precisará enviar a API key.

O guard é aplicado a nível de **controller** (`@UseGuards`), seguindo o padrão já usado no
`SchedulerController`. Não exporemos nenhuma rota nova que retorne valores de gasto sem `ApiKeyGuard`.

### 6.2 `CentralCartHmacGuard` (novo)

- Lê o **raw body** exato (habilitado via `NestFactory.create(AppModule, { rawBody: true })` no `main.ts`; acessa `request.rawBody`).
- `expected = HMAC_SHA256(secret, ` `${timestamp}.${rawBody}` `).digest('hex')`.
- Compara com `x-centralcart-signature` usando `safeCompare` (timing-safe, já existe).
- **Anti-replay:** rejeita se `|agora - timestamp| > 300s` (tolerância de 5 min).
- Secret dedicado: `CENTRALCART_ORDER_WEBHOOK_SECRET` (separado do `CENTRALCART_WEBHOOK_SECRET`
  legado usado pelo webhook de posts, porque cada webhook da Central Cart tem seu próprio secret).
- **Fail-secure:** diferente do guard de posts (opt-in), este **bloqueia** (`401`/`503`) se o secret
  não estiver configurado — pois um webhook não autenticado poderia conceder cargos indevidamente.
- Por que rawBody e não re-`JSON.stringify`: re-serializar o body parseado pode divergir do byte
  exato que a Central Cart assinou (ordem de chaves/espaços) e invalidar assinaturas legítimas.

## 7. Configuração / variáveis de ambiente

Novas (todas opcionais no boot; a feature é **opt-in** — fica inerte sem elas):

| Env | Uso |
|-----|-----|
| `DISCORD_BOT_TOKEN` | Token do bot (já declarado no config). Necessário p/ cargos e DM. |
| `DISCORD_GUILD_ID` | ID do servidor onde os cargos vivem (novo). |
| `CENTRALCART_ORDER_WEBHOOK_SECRET` | Secret HMAC do webhook `ORDER_APPROVED` (novo). |
| `DONATION_TIER_1_ROLE_ID` / `_2_` / `_3_` | (Opcional) sobrescreve os role IDs; default = IDs da tabela do §1. |

`config/config.ts` ganha: `discord.guildId`, e um bloco `donationRoles` com os tiers (threshold +
roleId + label), lendo das envs com fallback para os defaults. `env.validation.ts` declara as novas
envs como `@IsOptional`.

## 8. Infra / deploy

- **Sem volume novo** (stateless) — grande vantagem do design escolhido.
- Atualizar `.env.example`, `docker-compose`/Dockerfile (apenas novas envs; sem novo serviço).
- ⚠️ **Merge na `main` dispara deploy automático** (`release-deploy.yml`). A feature é opt-in: sem
  `DISCORD_BOT_TOKEN`/`DISCORD_GUILD_ID`/`CENTRALCART_ORDER_WEBHOOK_SECRET` ela não age e não quebra
  produção. Só "liga" quando as envs forem configuradas na VPS e o webhook apontado na Central Cart.
- Sem dependências nativas novas (`@discordjs/rest` e `discord-api-types` já estão no `package.json`).

## 9. Tratamento de erros e casos de borda

| Caso | Comportamento |
|------|---------------|
| `data.client_discord` ausente/null | Loga e ignora (não dá pra dar cargo). |
| Membro não está no servidor (GET member 404) | Loga aviso; encerra. Recebe o cargo quando doar de novo já dentro do servidor, ou via sync manual. |
| DM bloqueada pelo usuário (403) | Loga; **o cargo já foi atribuído** (a DM é best-effort). |
| `user_spent` falha/timeout | Captura e loga; não aplica nada nesta execução. Próxima ordem corrige. |
| Rate limit (429) | Tratado pelo `@discordjs/rest` (retry automático). |
| Webhook reentregue/duplicado | Idempotente: recomputa, vê que já tem o cargo → no-op. |
| Ordem grande pula 0→3 | Aplica direto o cargo do tier 3 e envia **uma** DM (tier final). |
| Total da API ainda não reflete a ordem recém-aprovada (race) | Aceitável; corrige na próxima ordem ou via sync manual. |

## 10. Testes

- `donation-tier.service.spec.ts` — `resolveTier`/`resolveCurrentTier`/`roleIdForTier`: limites
  (59,99 → 0; 60 → 1; 179 → 1; 500 → 3), pulo de tiers, role desconhecido ignorado.
- `donation-roles.service.spec.ts` — orquestração com mocks: sobe de tier (remove+add+DM), tier igual
  (no-op, sem DM), DM falha não impede cargo, sem `client_discord` ignora, membro fora do servidor.
- `discord-bot.service.spec.ts` — monta as rotas certas (mock do `REST`), trata 404 em getMember.
- `central-cart-hmac.guard.spec.ts` — assinatura válida; inválida (401); timestamp expirado (401);
  secret ausente (fail-secure).
- `central-cart-api.service.spec.ts` — `getUserSpent` (params email vs identifier; mapeamento da resposta).
- e2e — `POST /webhook/centralcart/order` com assinatura válida dispara o fluxo (Discord/CentralCart mockados);
  assinatura inválida → 401.

## 11. Escopo

**No MVP:** webhook `ORDER_APPROVED` → cargo por tier (substitutivo) + DM; endpoint admin de sync manual;
guard HMAC fail-secure; **hardening de segurança das rotas** (proteger as rotas existentes de
`top-customers` que vazam recebimentos); tudo stateless.

**Fora do MVP (extensões futuras):**
- Rebaixamento de tier em `ORDER_REFUNDED`/`ORDER_CHARGEDBACK`.
- Backfill automático em massa (depende de endpoint de listagem de ordens).
- Reconciliação periódica (cron) que varre membros e corrige divergências.

## 12. Pré-requisitos operacionais (Murilo, fora do código)

1. Criar/usar um **bot** do Discord; convidá-lo ao servidor com permissão **Manage Roles**.
2. Posicionar o cargo do **bot acima** dos 3 cargos de meta na hierarquia (senão o Discord recusa o PUT/DELETE).
3. Obter o `DISCORD_GUILD_ID` e o `DISCORD_BOT_TOKEN`.
4. Criar o webhook `ORDER_APPROVED` na Central Cart apontando para `/webhook/centralcart/order` e
   guardar o **secret** gerado em `CENTRALCART_ORDER_WEBHOOK_SECRET`.

## 13. Arquivos a criar / alterar

**Criar:**
- `src/donation-roles/donation-roles.module.ts`
- `src/donation-roles/donation-tier.service.ts` (+ `.spec.ts`)
- `src/donation-roles/donation-roles.service.ts` (+ `.spec.ts`)
- `src/donation-roles/donation-roles.controller.ts`
- `src/donation-roles/dto/sync-donation.dto.ts`
- `src/donation-roles/donation-tiers.config.ts`
- `src/discord/discord-bot.service.ts` (+ `.spec.ts`)
- `src/central-cart-api/dto/user-spent.dto.ts`
- `src/webhook/dto/central-cart-order-webhook.dto.ts`
- `src/common/guards/central-cart-hmac.guard.ts` (+ `.spec.ts`)

**Alterar:**
- `src/main.ts` (`rawBody: true`)
- `src/config/config.ts` (`discord.guildId`, bloco `donationRoles`)
- `src/config/env.validation.ts` (novas envs opcionais)
- `src/central-cart-api/central-cart-api.service.ts` (`getUserSpent`)
- `src/discord/discord.module.ts` (provê/exporta `DiscordBotService`)
- `src/webhook/webhook.controller.ts` + `src/webhook/webhook.module.ts` (endpoint `order` + imports)
- `src/central-cart-api/central-cart-api.controller.ts` (**hardening**: `@UseGuards(ApiKeyGuard)` — protege as rotas de `top-customers` que hoje expõem recebimentos)
- `.env.example`, `docker-compose`/`Dockerfile`, `README.md`, `CLAUDE.md` (documentação)
