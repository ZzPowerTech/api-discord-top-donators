# Cargos do Discord por meta de doação acumulada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atribuir automaticamente um cargo do Discord (por tier de doação acumulada: R$60/R$180/R$500) e notificar o membro por DM quando ele atinge a meta, disparado pelo webhook `ORDER_APPROVED` da Central Cart.

**Architecture:** Stateless. O total acumulado vem da Central Cart (`GET /app/user_spent`); o "tier atual" é inferido dos cargos que o membro já tem no Discord (idempotência sem banco). Cargos são substitutivos (sobe → troca). Bot do Discord via `@discordjs/rest`. Webhook protegido por HMAC-SHA256 fail-secure; rotas que expõem recebimentos protegidas por API key.

**Tech Stack:** NestJS 11, TypeScript, `@nestjs/axios` (HttpService), `@discordjs/rest` + `discord-api-types/v10`, `class-validator`/`class-transformer`, Jest. Crypto nativo (HMAC).

**Spec:** `docs/superpowers/specs/2026-06-18-discord-donation-roles-design.md`

**Convenções do projeto (seguir):**
- Testes unitários: instanciar a classe direto com mocks no construtor (sem `Test.createTestingModule` quando possível); mockar `HttpService` como `{ get: jest.fn() }` retornando `of(...)`/`throwError(...)` do `rxjs`; setar env via `process.env` no `beforeEach` e restaurar no `afterEach`.
- Logs e mensagens em português; identificadores em inglês.
- Prettier: aspas simples, trailing commas.
- Commits: Conventional Commits. Rodar `npm run lint` e `npm test` antes de cada commit.

---

## File Structure

**Criar:**
- `src/donation-roles/donation-tiers.config.ts` — definição dos tiers (threshold + roleId + label), lendo env com defaults.
- `src/donation-roles/donation-tier.service.ts` (+ `.spec.ts`) — lógica pura de resolução de tier.
- `src/donation-roles/donation-roles.service.ts` (+ `.spec.ts`) — orquestrador (total → tier → swap + DM).
- `src/donation-roles/donation-roles.controller.ts` — endpoint admin `POST /donations/sync`.
- `src/donation-roles/dto/sync-donation.dto.ts` — body do sync manual.
- `src/donation-roles/donation-roles.module.ts` — módulo.
- `src/discord/discord-bot.service.ts` (+ `.spec.ts`) — REST do Discord (cargos + DM).
- `src/central-cart-api/dto/user-spent.dto.ts` — tipos de `user_spent`.
- `src/webhook/dto/central-cart-order-webhook.dto.ts` — DTO do webhook de ordem.
- `src/common/guards/central-cart-hmac.guard.ts` (+ `.spec.ts`) — guard HMAC.

**Modificar:**
- `src/config/config.ts` — `discord.guildId`, `centralCart.orderWebhookSecret`.
- `src/config/env.validation.ts` — novas envs opcionais.
- `src/central-cart-api/central-cart-api.service.ts` — `getUserSpent`.
- `src/central-cart-api/central-cart-api.controller.ts` — `@UseGuards(ApiKeyGuard)` (hardening).
- `src/discord/discord.module.ts` — provider `DISCORD_REST` + `DiscordBotService` (provide/export).
- `src/webhook/webhook.controller.ts` — endpoint `centralcart/order`.
- `src/webhook/webhook.module.ts` — importar `DonationRolesModule`.
- `src/app.module.ts` — importar `DonationRolesModule`.
- `src/main.ts` — `NestFactory.create(AppModule, { rawBody: true })`.
- `.env.example`, `README.md`, `CLAUDE.md`, `docker-compose*.yml`/`Dockerfile` (documentação de envs).

---

## Task 1: Config — envs e definição dos tiers

**Files:**
- Create: `src/donation-roles/donation-tiers.config.ts`
- Modify: `src/config/config.ts`
- Modify: `src/config/env.validation.ts`

- [ ] **Step 1: Criar `donation-tiers.config.ts`**

```ts
/** Um tier de doação: meta acumulada (líquida) → cargo do Discord. */
export interface DonationTier {
  tier: number; // 1, 2, 3 (ordem crescente)
  threshold: number; // valor líquido acumulado em reais
  roleId: string; // ID do cargo no Discord
  label: string; // texto exibido na DM (ex.: "R$ 60")
}

// Defaults fornecidos pelo Murilo; podem ser sobrescritos por env.
const DEFAULT_ROLE_IDS: Record<number, string> = {
  1: '1517021451406938122',
  2: '1517021366367293571',
  3: '1517021393873534996',
};

/**
 * Lista de tiers ordenada por threshold crescente. Lê os role IDs das envs
 * DONATION_TIER_<n>_ROLE_ID, caindo para os defaults quando ausentes.
 */
export function getDonationTiers(): DonationTier[] {
  return [
    {
      tier: 1,
      threshold: 60,
      roleId: process.env.DONATION_TIER_1_ROLE_ID || DEFAULT_ROLE_IDS[1],
      label: 'R$ 60',
    },
    {
      tier: 2,
      threshold: 180,
      roleId: process.env.DONATION_TIER_2_ROLE_ID || DEFAULT_ROLE_IDS[2],
      label: 'R$ 180',
    },
    {
      tier: 3,
      threshold: 500,
      roleId: process.env.DONATION_TIER_3_ROLE_ID || DEFAULT_ROLE_IDS[3],
      label: 'R$ 500',
    },
  ];
}
```

- [ ] **Step 2: Adicionar getters em `config.ts`**

No objeto `discord`, adicionar após `botToken`:

```ts
    get guildId() {
      return process.env.DISCORD_GUILD_ID;
    },
```

No objeto `centralCart`, adicionar após `webhookSecret`:

```ts
    get orderWebhookSecret() {
      return process.env.CENTRALCART_ORDER_WEBHOOK_SECRET;
    },
```

- [ ] **Step 3: Declarar as novas envs em `env.validation.ts`**

Adicionar à classe `EnvironmentVariables` (todas opcionais):

```ts
  @IsOptional()
  @IsString()
  DISCORD_GUILD_ID?: string;

  @IsOptional()
  @IsString()
  CENTRALCART_ORDER_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  DONATION_TIER_1_ROLE_ID?: string;

  @IsOptional()
  @IsString()
  DONATION_TIER_2_ROLE_ID?: string;

  @IsOptional()
  @IsString()
  DONATION_TIER_3_ROLE_ID?: string;
```

- [ ] **Step 4: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/donation-roles/donation-tiers.config.ts src/config/config.ts src/config/env.validation.ts
git commit -m "feat(donation-roles): config de tiers e envs (guild, webhook secret, role ids)"
```

---

## Task 2: DonationTierService (lógica pura, TDD)

**Files:**
- Create: `src/donation-roles/donation-tier.service.ts`
- Test: `src/donation-roles/donation-tier.service.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { DonationTierService } from './donation-tier.service';

const ROLE_1 = '1517021451406938122';
const ROLE_2 = '1517021366367293571';
const ROLE_3 = '1517021393873534996';

describe('DonationTierService', () => {
  const service = new DonationTierService();

  describe('resolveTier', () => {
    it.each([
      [0, 0],
      [59.99, 0],
      [60, 1],
      [179.99, 1],
      [180, 2],
      [499.99, 2],
      [500, 3],
      [9999, 3],
    ])('total %p => tier %p', (total, expected) => {
      expect(service.resolveTier(total)).toBe(expected);
    });
  });

  describe('resolveCurrentTier', () => {
    it('retorna 0 quando o membro não tem nenhum cargo de tier', () => {
      expect(service.resolveCurrentTier(['999', '888'])).toBe(0);
    });

    it('retorna o maior tier dentre os cargos do membro', () => {
      expect(service.resolveCurrentTier([ROLE_1, ROLE_2])).toBe(2);
      expect(service.resolveCurrentTier([ROLE_3])).toBe(3);
    });
  });

  describe('roleIdForTier / tierConfig', () => {
    it('mapeia tier para roleId e config', () => {
      expect(service.roleIdForTier(1)).toBe(ROLE_1);
      expect(service.roleIdForTier(3)).toBe(ROLE_3);
      expect(service.roleIdForTier(0)).toBeNull();
      expect(service.tierConfig(2)?.label).toBe('R$ 180');
      expect(service.tierConfig(0)).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest src/donation-roles/donation-tier.service.spec.ts`
Expected: FAIL (módulo `donation-tier.service` não existe).

- [ ] **Step 3: Implementar o service**

```ts
import { Injectable } from '@nestjs/common';
import { DonationTier, getDonationTiers } from './donation-tiers.config';

/**
 * Regras puras de tier (sem I/O). Trabalha sobre a lista de tiers ordenada por
 * threshold crescente. Testável isoladamente.
 */
@Injectable()
export class DonationTierService {
  readonly tiers: DonationTier[] = getDonationTiers()
    .slice()
    .sort((a, b) => a.threshold - b.threshold);

  /** Maior tier cujo threshold é alcançado pelo total. 0 = nenhum. */
  resolveTier(totalNet: number): number {
    let result = 0;
    for (const tier of this.tiers) {
      if (totalNet >= tier.threshold) {
        result = tier.tier;
      }
    }
    return result;
  }

  /** Maior tier cujo cargo o membro já possui. 0 = nenhum. */
  resolveCurrentTier(memberRoleIds: string[]): number {
    let result = 0;
    for (const tier of this.tiers) {
      if (memberRoleIds.includes(tier.roleId)) {
        result = Math.max(result, tier.tier);
      }
    }
    return result;
  }

  roleIdForTier(tier: number): string | null {
    return this.tiers.find((t) => t.tier === tier)?.roleId ?? null;
  }

  tierConfig(tier: number): DonationTier | null {
    return this.tiers.find((t) => t.tier === tier) ?? null;
  }
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `npx jest src/donation-roles/donation-tier.service.spec.ts`
Expected: PASS (todos os casos).

- [ ] **Step 5: Commit**

```bash
git add src/donation-roles/donation-tier.service.ts src/donation-roles/donation-tier.service.spec.ts
git commit -m "feat(donation-roles): DonationTierService com resolução de tier por total e por cargos"
```

---

## Task 3: CentralCartApiService.getUserSpent (TDD)

**Files:**
- Create: `src/central-cart-api/dto/user-spent.dto.ts`
- Modify: `src/central-cart-api/central-cart-api.service.ts`
- Test: `src/central-cart-api/central-cart-api.service.spec.ts` (adicionar describe)

- [ ] **Step 1: Criar o DTO**

```ts
/** Resposta crua de GET /app/user_spent (valores já numéricos). */
export interface RawUserSpent {
  total_net_received: number;
  total_gross_received: number;
}

/** Forma interna normalizada. */
export interface UserSpent {
  totalNetReceived: number;
  totalGrossReceived: number;
}
```

- [ ] **Step 2: Escrever o teste que falha** (adicionar ao describe existente do spec)

```ts
  describe('getUserSpent', () => {
    it('consulta por email e mapeia a resposta', async () => {
      httpGet.mockReturnValue(
        of({ data: { total_net_received: 240, total_gross_received: 250 } }),
      );

      const result = await service.getUserSpent({ email: 'a@b.com' });

      expect(result).toEqual({ totalNetReceived: 240, totalGrossReceived: 250 });
      const [, options] = httpGet.mock.calls[0];
      expect(options.params).toEqual({ email: 'a@b.com' });
    });

    it('cai para client_identifier quando não há email', async () => {
      httpGet.mockReturnValue(
        of({ data: { total_net_received: 60, total_gross_received: 60 } }),
      );

      await service.getUserSpent({ identifier: 'Nick' });

      const [, options] = httpGet.mock.calls[0];
      expect(options.params).toEqual({ client_identifier: 'Nick' });
    });

    it('relança o erro em falha HTTP', async () => {
      httpGet.mockReturnValue(throwError(() => new Error('HTTP 500')));
      await expect(service.getUserSpent({ email: 'a@b.com' })).rejects.toThrow(
        'HTTP 500',
      );
    });
  });
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx jest src/central-cart-api/central-cart-api.service.spec.ts -t getUserSpent`
Expected: FAIL (`service.getUserSpent is not a function`).

- [ ] **Step 4: Implementar `getUserSpent`**

No topo do service, adicionar import:

```ts
import { RawUserSpent, UserSpent } from './dto/user-spent.dto';
```

Adicionar o método (após `getTopCustomersFromPreviousMonth`):

```ts
  /**
   * Total já gasto por um cliente. Consulta por email (preferencial) ou
   * client_identifier. Diferente de getPosts, RELANÇA em erro: sem o total não
   * há como decidir o tier; quem chama (orquestrador/controller) trata.
   */
  async getUserSpent(query: {
    email?: string;
    identifier?: string;
  }): Promise<UserSpent> {
    const url = `${config.centralCart.apiUrl}/app/user_spent`;
    const params = query.email
      ? { email: query.email }
      : { client_identifier: query.identifier };

    const response = await firstValueFrom(
      this.httpService.get<RawUserSpent>(url, {
        params,
        headers: {
          Authorization: `Bearer ${config.centralCart.bearerToken}`,
        },
      }),
    );

    return {
      totalNetReceived: response.data.total_net_received ?? 0,
      totalGrossReceived: response.data.total_gross_received ?? 0,
    };
  }
```

- [ ] **Step 5: Rodar e confirmar verde**

Run: `npx jest src/central-cart-api/central-cart-api.service.spec.ts`
Expected: PASS (incluindo os testes antigos).

- [ ] **Step 6: Commit**

```bash
git add src/central-cart-api/dto/user-spent.dto.ts src/central-cart-api/central-cart-api.service.ts src/central-cart-api/central-cart-api.service.spec.ts
git commit -m "feat(central-cart): getUserSpent consulta total gasto por email/identifier"
```

---

## Task 4: DiscordBotService (TDD)

**Files:**
- Create: `src/discord/discord-bot.service.ts`
- Test: `src/discord/discord-bot.service.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { Routes } from 'discord-api-types/v10';
import { DiscordBotService } from './discord-bot.service';
import type { REST } from '@discordjs/rest';

describe('DiscordBotService', () => {
  let service: DiscordBotService;
  let rest: { get: jest.Mock; put: jest.Mock; delete: jest.Mock; post: jest.Mock };
  const ORIGINAL_ENV = process.env;
  const GUILD = 'guild-1';
  const USER = 'user-1';
  const ROLE = 'role-1';

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, DISCORD_GUILD_ID: GUILD };
    rest = { get: jest.fn(), put: jest.fn(), delete: jest.fn(), post: jest.fn() };
    service = new DiscordBotService(rest as unknown as REST);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('getMemberRoleIds', () => {
    it('retorna os roles do membro', async () => {
      rest.get.mockResolvedValue({ roles: ['a', 'b'] });
      await expect(service.getMemberRoleIds(USER)).resolves.toEqual(['a', 'b']);
      expect(rest.get).toHaveBeenCalledWith(Routes.guildMember(GUILD, USER));
    });

    it('retorna null quando o membro não está no servidor (404)', async () => {
      rest.get.mockRejectedValue({ status: 404 });
      await expect(service.getMemberRoleIds(USER)).resolves.toBeNull();
    });

    it('relança erros que não são 404', async () => {
      rest.get.mockRejectedValue({ status: 500 });
      await expect(service.getMemberRoleIds(USER)).rejects.toEqual({ status: 500 });
    });
  });

  it('addRole faz PUT na rota correta', async () => {
    rest.put.mockResolvedValue(undefined);
    await service.addRole(USER, ROLE);
    expect(rest.put).toHaveBeenCalledWith(Routes.guildMemberRole(GUILD, USER, ROLE));
  });

  it('removeRole faz DELETE na rota correta', async () => {
    rest.delete.mockResolvedValue(undefined);
    await service.removeRole(USER, ROLE);
    expect(rest.delete).toHaveBeenCalledWith(Routes.guildMemberRole(GUILD, USER, ROLE));
  });

  it('sendDirectMessage abre o canal de DM e envia o embed', async () => {
    rest.post.mockResolvedValueOnce({ id: 'dm-1' }).mockResolvedValueOnce(undefined);
    const embed = { title: 'oi' };
    await service.sendDirectMessage(USER, embed);
    expect(rest.post).toHaveBeenNthCalledWith(1, Routes.userChannels(), {
      body: { recipient_id: USER },
    });
    expect(rest.post).toHaveBeenNthCalledWith(2, Routes.channelMessages('dm-1'), {
      body: { embeds: [embed] },
    });
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest src/discord/discord-bot.service.spec.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o service**

```ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { REST } from '@discordjs/rest';
import {
  Routes,
  type APIEmbed,
  type RESTGetAPIGuildMemberResult,
} from 'discord-api-types/v10';
import { config } from '../config/config';

export const DISCORD_REST = 'DISCORD_REST';

/** Erro com status HTTP (DiscordAPIError expõe `.status`). */
function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 404
  );
}

/**
 * Operações de bot no Discord (cargos + DM) via REST. Usa o token de bot
 * (config.discord.botToken) injetado na instância DISCORD_REST.
 */
@Injectable()
export class DiscordBotService {
  private readonly logger = new Logger(DiscordBotService.name);

  constructor(@Inject(DISCORD_REST) private readonly rest: REST) {}

  private get guildId(): string {
    const guildId = config.discord.guildId;
    if (!guildId) {
      throw new Error('DISCORD_GUILD_ID não configurado');
    }
    return guildId;
  }

  /** IDs dos cargos do membro, ou null se ele não está no servidor (404). */
  async getMemberRoleIds(userId: string): Promise<string[] | null> {
    try {
      const member = (await this.rest.get(
        Routes.guildMember(this.guildId, userId),
      )) as RESTGetAPIGuildMemberResult;
      return member.roles;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async addRole(userId: string, roleId: string): Promise<void> {
    await this.rest.put(Routes.guildMemberRole(this.guildId, userId, roleId));
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    await this.rest.delete(Routes.guildMemberRole(this.guildId, userId, roleId));
  }

  /** Abre (ou reabre) o canal de DM e envia o embed. Pode lançar 403 se a DM estiver bloqueada. */
  async sendDirectMessage(userId: string, embed: APIEmbed): Promise<void> {
    const channel = (await this.rest.post(Routes.userChannels(), {
      body: { recipient_id: userId },
    })) as { id: string };

    await this.rest.post(Routes.channelMessages(channel.id), {
      body: { embeds: [embed] },
    });
  }
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `npx jest src/discord/discord-bot.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/discord/discord-bot.service.ts src/discord/discord-bot.service.spec.ts
git commit -m "feat(discord): DiscordBotService (cargos + DM) via @discordjs/rest"
```

---

## Task 5: DonationRolesService (orquestrador, TDD)

**Files:**
- Create: `src/donation-roles/donation-roles.service.ts`
- Test: `src/donation-roles/donation-roles.service.spec.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { DonationRolesService } from './donation-roles.service';
import { DonationTierService } from './donation-tier.service';
import type { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import type { DiscordBotService } from '../discord/discord-bot.service';

const ROLE_1 = '1517021451406938122';
const ROLE_2 = '1517021366367293571';

describe('DonationRolesService', () => {
  let service: DonationRolesService;
  let centralCart: { getUserSpent: jest.Mock };
  let bot: {
    getMemberRoleIds: jest.Mock;
    addRole: jest.Mock;
    removeRole: jest.Mock;
    sendDirectMessage: jest.Mock;
  };

  beforeEach(() => {
    centralCart = { getUserSpent: jest.fn() };
    bot = {
      getMemberRoleIds: jest.fn(),
      addRole: jest.fn().mockResolvedValue(undefined),
      removeRole: jest.fn().mockResolvedValue(undefined),
      sendDirectMessage: jest.fn().mockResolvedValue(undefined),
    };
    service = new DonationRolesService(
      centralCart as unknown as CentralCartApiService,
      bot as unknown as DiscordBotService,
      new DonationTierService(),
    );
  });

  it('sobe de tier: remove o cargo antigo, adiciona o novo e envia DM', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 180 });
    bot.getMemberRoleIds.mockResolvedValue([ROLE_1]); // tier atual = 1

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.removeRole).toHaveBeenCalledWith('u1', ROLE_1);
    expect(bot.addRole).toHaveBeenCalledWith('u1', ROLE_2);
    expect(bot.sendDirectMessage).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ previousTier: 1, newTier: 2, action: 'upgraded' });
  });

  it('pulo 0→3: não remove nada, adiciona o tier 3 e envia uma única DM', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 600 });
    bot.getMemberRoleIds.mockResolvedValue([]); // sem cargo

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.removeRole).not.toHaveBeenCalled();
    expect(bot.addRole).toHaveBeenCalledTimes(1);
    expect(bot.sendDirectMessage).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ newTier: 3, action: 'upgraded' });
  });

  it('tier alvo igual ao atual: não faz nada (sem DM)', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 200 });
    bot.getMemberRoleIds.mockResolvedValue([ROLE_2]); // já tier 2

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.addRole).not.toHaveBeenCalled();
    expect(bot.removeRole).not.toHaveBeenCalled();
    expect(bot.sendDirectMessage).not.toHaveBeenCalled();
    expect(result).toMatchObject({ action: 'none' });
  });

  it('total abaixo de qualquer meta: não consulta o Discord', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 30 });

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.getMemberRoleIds).not.toHaveBeenCalled();
    expect(result).toMatchObject({ newTier: 0, action: 'none' });
  });

  it('membro fora do servidor: não aplica cargo', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 100 });
    bot.getMemberRoleIds.mockResolvedValue(null);

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.addRole).not.toHaveBeenCalled();
    expect(result).toMatchObject({ action: 'not_in_guild' });
  });

  it('falha de DM não impede a atribuição do cargo', async () => {
    centralCart.getUserSpent.mockResolvedValue({ totalNetReceived: 60 });
    bot.getMemberRoleIds.mockResolvedValue([]);
    bot.sendDirectMessage.mockRejectedValue({ status: 403 });

    const result = await service.applyForDiscordUser({ discordId: 'u1', email: 'a@b.com' });

    expect(bot.addRole).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ newTier: 1, action: 'upgraded' });
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest src/donation-roles/donation-roles.service.spec.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o orquestrador**

```ts
import { Injectable, Logger } from '@nestjs/common';
import type { APIEmbed } from 'discord-api-types/v10';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { DiscordBotService } from '../discord/discord-bot.service';
import { DonationTierService } from './donation-tier.service';
import { DonationTier } from './donation-tiers.config';
import { getErrorMessage } from '../common/utils/get-error-message';

const DM_EMBED_COLOR = 0xffd700;

export type DonationSyncAction = 'upgraded' | 'none' | 'not_in_guild';

export interface DonationSyncResult {
  discordId: string;
  total: number;
  previousTier: number;
  newTier: number;
  action: DonationSyncAction;
}

export interface ApplyDonationInput {
  discordId: string;
  email?: string;
  identifier?: string;
}

/**
 * Decide e aplica o cargo de tier do membro a partir do total gasto. Stateless:
 * a fonte do total é a API Central Cart; o tier atual é inferido dos cargos do
 * membro no Discord. RELANÇA erros de consulta/cargo (o webhook controller é
 * quem garante resiliência); a DM é best-effort (falha não interrompe).
 */
@Injectable()
export class DonationRolesService {
  private readonly logger = new Logger(DonationRolesService.name);

  constructor(
    private readonly centralCart: CentralCartApiService,
    private readonly discordBot: DiscordBotService,
    private readonly tierService: DonationTierService,
  ) {}

  async applyForDiscordUser(
    input: ApplyDonationInput,
  ): Promise<DonationSyncResult> {
    const { discordId, email, identifier } = input;

    const spent = await this.centralCart.getUserSpent({ email, identifier });
    const total = spent.totalNetReceived;
    const targetTier = this.tierService.resolveTier(total);

    if (targetTier === 0) {
      return { discordId, total, previousTier: 0, newTier: 0, action: 'none' };
    }

    const roleIds = await this.discordBot.getMemberRoleIds(discordId);
    if (roleIds === null) {
      this.logger.warn(
        `Membro ${discordId} não está no servidor; cargo não aplicado.`,
      );
      return {
        discordId,
        total,
        previousTier: 0,
        newTier: 0,
        action: 'not_in_guild',
      };
    }

    const currentTier = this.tierService.resolveCurrentTier(roleIds);
    if (targetTier <= currentTier) {
      return {
        discordId,
        total,
        previousTier: currentTier,
        newTier: currentTier,
        action: 'none',
      };
    }

    if (currentTier > 0) {
      const oldRoleId = this.tierService.roleIdForTier(currentTier);
      if (oldRoleId) {
        await this.discordBot.removeRole(discordId, oldRoleId);
      }
    }

    const targetConfig = this.tierService.tierConfig(targetTier);
    // targetTier > 0 garante config presente.
    const newRoleId = targetConfig!.roleId;
    await this.discordBot.addRole(discordId, newRoleId);

    try {
      await this.discordBot.sendDirectMessage(
        discordId,
        this.buildDmEmbed(targetConfig!),
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao enviar DM para ${discordId} (cargo já atribuído): ${getErrorMessage(error)}`,
      );
    }

    this.logger.log(
      `Membro ${discordId}: tier ${currentTier} → ${targetTier} (total ${total}).`,
    );

    return {
      discordId,
      total,
      previousTier: currentTier,
      newTier: targetTier,
      action: 'upgraded',
    };
  }

  private buildDmEmbed(tier: DonationTier): APIEmbed {
    return {
      title: '🎉 Meta de doação atingida!',
      description:
        `Você atingiu **${tier.label}** em doações no AusTV e desbloqueou um novo cargo! 💜\n\n` +
        'Muito obrigado pelo seu apoio — é graças a você que mantemos o servidor no ar! 🚀',
      color: DM_EMBED_COLOR,
      timestamp: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 4: Rodar e confirmar verde**

Run: `npx jest src/donation-roles/donation-roles.service.spec.ts`
Expected: PASS (todos os cenários).

- [ ] **Step 5: Commit**

```bash
git add src/donation-roles/donation-roles.service.ts src/donation-roles/donation-roles.service.spec.ts
git commit -m "feat(donation-roles): orquestrador aplica tier (swap de cargo + DM best-effort)"
```

---

## Task 6: CentralCartHmacGuard + rawBody (TDD)

**Files:**
- Create: `src/common/guards/central-cart-hmac.guard.ts`
- Test: `src/common/guards/central-cart-hmac.guard.spec.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
import { createHmac } from 'crypto';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CentralCartHmacGuard } from './central-cart-hmac.guard';

const SECRET = 'whsec_test';
const BODY = '{"event":"ORDER_APPROVED"}';

function sign(timestamp: string, body: string): string {
  return createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex');
}

function context(
  headers: Record<string, string | undefined>,
  rawBody: string,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        header: (name: string) => headers[name],
        rawBody: Buffer.from(rawBody),
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('CentralCartHmacGuard', () => {
  const guard = new CentralCartHmacGuard();
  const ORIGINAL_ENV = process.env;

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('nega (503) quando o secret não está configurado', () => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.CENTRALCART_ORDER_WEBHOOK_SECRET;
    expect(() => guard.canActivate(context({}, BODY))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('aceita assinatura válida dentro da janela de tempo', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_ORDER_WEBHOOK_SECRET: SECRET };
    const ts = String(Math.floor(Date.now() / 1000));
    const ctx = context(
      { 'x-centralcart-timestamp': ts, 'x-centralcart-signature': sign(ts, BODY) },
      BODY,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('nega (401) quando a assinatura é inválida', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_ORDER_WEBHOOK_SECRET: SECRET };
    const ts = String(Math.floor(Date.now() / 1000));
    const ctx = context(
      { 'x-centralcart-timestamp': ts, 'x-centralcart-signature': 'deadbeef' },
      BODY,
    );
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('nega (401) quando o timestamp está expirado', () => {
    process.env = { ...ORIGINAL_ENV, CENTRALCART_ORDER_WEBHOOK_SECRET: SECRET };
    const ts = String(Math.floor(Date.now() / 1000) - 1000); // > 300s atrás
    const ctx = context(
      { 'x-centralcart-timestamp': ts, 'x-centralcart-signature': sign(ts, BODY) },
      BODY,
    );
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 2: Rodar e confirmar a falha**

Run: `npx jest src/common/guards/central-cart-hmac.guard.spec.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar o guard**

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { config } from '../../config/config';
import { safeCompare } from '../utils/safe-compare';

const SIGNATURE_HEADER = 'x-centralcart-signature';
const TIMESTAMP_HEADER = 'x-centralcart-timestamp';
const MAX_SKEW_SECONDS = 300;

/**
 * Valida o webhook de ordem da Central Cart por HMAC-SHA256 sobre
 * `${timestamp}.${rawBody}`, com o secret CENTRALCART_ORDER_WEBHOOK_SECRET.
 * Fail-secure: sem secret, o acesso é negado (concede cargos — não pode ficar
 * aberto). Usa o raw body exato (NestFactory com { rawBody: true }) para que a
 * assinatura case byte a byte com o que a Central Cart assinou.
 */
@Injectable()
export class CentralCartHmacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const secret = config.centralCart.orderWebhookSecret;
    if (!secret) {
      throw new ServiceUnavailableException(
        'Webhook protegido: configure CENTRALCART_ORDER_WEBHOOK_SECRET no servidor.',
      );
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();
    const signature = request.header(SIGNATURE_HEADER);
    const timestamp = request.header(TIMESTAMP_HEADER);

    if (!signature || !timestamp) {
      throw new UnauthorizedException('Assinatura ou timestamp ausente.');
    }

    let ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
      throw new UnauthorizedException('Timestamp inválido.');
    }
    // Aceita timestamp em segundos ou milissegundos.
    if (ts > 1e12) {
      ts = ts / 1000;
    }
    if (Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
      throw new UnauthorizedException('Timestamp expirado.');
    }

    const rawBody = request.rawBody?.toString('utf8') ?? '';
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest('hex');

    if (!safeCompare(signature, expected)) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    return true;
  }
}
```

- [ ] **Step 4: Habilitar rawBody no `main.ts`**

Trocar a linha de criação do app:

```ts
  const app = await NestFactory.create(AppModule, { rawBody: true });
```

- [ ] **Step 5: Rodar e confirmar verde**

Run: `npx jest src/common/guards/central-cart-hmac.guard.spec.ts && npm run build`
Expected: PASS + build ok.

- [ ] **Step 6: Commit**

```bash
git add src/common/guards/central-cart-hmac.guard.ts src/common/guards/central-cart-hmac.guard.spec.ts src/main.ts
git commit -m "feat(security): CentralCartHmacGuard (HMAC-SHA256 fail-secure) + rawBody"
```

---

## Task 7: DTO + endpoint do webhook de ordem (TDD)

**Files:**
- Create: `src/webhook/dto/central-cart-order-webhook.dto.ts`
- Modify: `src/webhook/webhook.controller.ts`
- Test: `src/webhook/webhook.controller.spec.ts` (criar)

- [ ] **Step 1: Criar o DTO**

```ts
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Subconjunto relevante de `data` (detalhes da ordem). whitelist remove o resto. */
export class CentralCartOrderDataDto {
  @IsOptional()
  @IsString()
  client_discord?: string | null;

  @IsOptional()
  @IsString()
  client_email?: string;

  @IsOptional()
  @IsString()
  client_identifier?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  internal_id?: string;

  @IsOptional()
  @IsNumber()
  net_received?: number;
}

/** Envelope padronizado dos webhooks da Central Cart. */
export class CentralCartOrderWebhookDto {
  @IsString()
  id!: string;

  @IsString()
  event!: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CentralCartOrderDataDto)
  data!: CentralCartOrderDataDto;
}
```

- [ ] **Step 2: Escrever o teste do controller (falha)**

```ts
import { WebhookController } from './webhook.controller';
import type { DiscordService } from '../discord/discord.service';
import type { DonationRolesService } from '../donation-roles/donation-roles.service';
import { CentralCartOrderWebhookDto } from './dto/central-cart-order-webhook.dto';

describe('WebhookController.handleOrder', () => {
  let controller: WebhookController;
  let donationRoles: { applyForDiscordUser: jest.Mock };

  beforeEach(() => {
    donationRoles = { applyForDiscordUser: jest.fn().mockResolvedValue({ action: 'upgraded' }) };
    controller = new WebhookController(
      {} as unknown as DiscordService,
      donationRoles as unknown as DonationRolesService,
    );
  });

  function order(partial: Partial<CentralCartOrderWebhookDto>): CentralCartOrderWebhookDto {
    return {
      id: 'evt1',
      event: 'ORDER_APPROVED',
      data: { client_discord: '123', client_email: 'a@b.com' },
      ...partial,
    } as CentralCartOrderWebhookDto;
  }

  it('processa ORDER_APPROVED com client_discord', async () => {
    await controller.handleOrder(order({}));
    expect(donationRoles.applyForDiscordUser).toHaveBeenCalledWith({
      discordId: '123',
      email: 'a@b.com',
      identifier: undefined,
    });
  });

  it('ignora eventos que não são ORDER_APPROVED', async () => {
    await controller.handleOrder(order({ event: 'ORDER_CREATED' }));
    expect(donationRoles.applyForDiscordUser).not.toHaveBeenCalled();
  });

  it('ignora ordem aprovada sem client_discord', async () => {
    await controller.handleOrder(order({ data: { client_discord: null } }));
    expect(donationRoles.applyForDiscordUser).not.toHaveBeenCalled();
  });

  it('não propaga erro do processamento (resiliência do webhook)', async () => {
    donationRoles.applyForDiscordUser.mockRejectedValue(new Error('boom'));
    await expect(controller.handleOrder(order({}))).resolves.toMatchObject({
      success: false,
    });
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx jest src/webhook/webhook.controller.spec.ts`
Expected: FAIL (construtor não aceita 2º arg / método não existe).

- [ ] **Step 4: Implementar o endpoint**

No `webhook.controller.ts`, adicionar imports:

```ts
import { CentralCartHmacGuard } from '../common/guards/central-cart-hmac.guard';
import { CentralCartOrderWebhookDto } from './dto/central-cart-order-webhook.dto';
import { DonationRolesService } from '../donation-roles/donation-roles.service';
```

Injetar o serviço no construtor:

```ts
  constructor(
    private readonly discordService: DiscordService,
    private readonly donationRolesService: DonationRolesService,
  ) {}
```

Adicionar o handler:

```ts
  @Post('centralcart/order')
  @UseGuards(CentralCartHmacGuard)
  async handleOrder(@Body() dto: CentralCartOrderWebhookDto) {
    if (dto.event !== 'ORDER_APPROVED') {
      return { success: true, ignored: dto.event };
    }

    const discordId = dto.data.client_discord;
    if (!discordId) {
      this.logger.warn('Ordem aprovada sem client_discord; ignorando.');
      return { success: true, ignored: 'no_discord' };
    }

    try {
      const result = await this.donationRolesService.applyForDiscordUser({
        discordId,
        email: dto.data.client_email,
        identifier: dto.data.client_identifier,
      });
      return { success: true, result };
    } catch (error) {
      // Resiliência: o webhook não deve falhar por erro de processamento.
      this.logger.error('Erro ao processar ordem aprovada', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }
```

- [ ] **Step 5: Rodar e confirmar verde**

Run: `npx jest src/webhook/webhook.controller.spec.ts`
Expected: PASS. (O wiring do módulo entra na Task 9; o build completo pode falhar até lá — ok.)

- [ ] **Step 6: Commit**

```bash
git add src/webhook/dto/central-cart-order-webhook.dto.ts src/webhook/webhook.controller.ts src/webhook/webhook.controller.spec.ts
git commit -m "feat(webhook): endpoint ORDER_APPROVED protegido por HMAC dispara cargo por tier"
```

---

## Task 8: Endpoint admin de sync manual (TDD)

**Files:**
- Create: `src/donation-roles/dto/sync-donation.dto.ts`
- Create: `src/donation-roles/donation-roles.controller.ts`
- Test: `src/donation-roles/donation-roles.controller.spec.ts`

- [ ] **Step 1: Criar o DTO**

```ts
import { IsOptional, IsString } from 'class-validator';

/** Body de POST /donations/sync. Ao menos um entre email e identifier. */
export class SyncDonationDto {
  @IsString()
  discordId!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  identifier?: string;
}
```

- [ ] **Step 2: Escrever o teste do controller (falha)**

```ts
import { DonationRolesController } from './donation-roles.controller';
import type { DonationRolesService } from './donation-roles.service';

describe('DonationRolesController', () => {
  it('encaminha o sync para o serviço e retorna o resultado', async () => {
    const apply = jest.fn().mockResolvedValue({ action: 'upgraded', newTier: 2 });
    const controller = new DonationRolesController({
      applyForDiscordUser: apply,
    } as unknown as DonationRolesService);

    const result = await controller.sync({
      discordId: 'u1',
      email: 'a@b.com',
    });

    expect(apply).toHaveBeenCalledWith({
      discordId: 'u1',
      email: 'a@b.com',
      identifier: undefined,
    });
    expect(result).toMatchObject({ success: true, result: { newTier: 2 } });
  });
});
```

- [ ] **Step 3: Rodar e confirmar a falha**

Run: `npx jest src/donation-roles/donation-roles.controller.spec.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 4: Implementar o controller**

```ts
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DonationRolesService } from './donation-roles.service';
import { SyncDonationDto } from './dto/sync-donation.dto';

/** Operações administrativas de cargos de doação. Protegido por API key. */
@Controller('donations')
@UseGuards(ApiKeyGuard)
export class DonationRolesController {
  constructor(private readonly donationRolesService: DonationRolesService) {}

  @Post('sync')
  async sync(@Body() dto: SyncDonationDto) {
    const result = await this.donationRolesService.applyForDiscordUser({
      discordId: dto.discordId,
      email: dto.email,
      identifier: dto.identifier,
    });
    return { success: true, result };
  }
}
```

- [ ] **Step 5: Rodar e confirmar verde**

Run: `npx jest src/donation-roles/donation-roles.controller.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/donation-roles/dto/sync-donation.dto.ts src/donation-roles/donation-roles.controller.ts src/donation-roles/donation-roles.controller.spec.ts
git commit -m "feat(donation-roles): endpoint admin POST /donations/sync (ApiKeyGuard)"
```

---

## Task 9: Wiring dos módulos

**Files:**
- Modify: `src/discord/discord.module.ts`
- Create: `src/donation-roles/donation-roles.module.ts`
- Modify: `src/webhook/webhook.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: `discord.module.ts` — provider REST + DiscordBotService**

```ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { REST } from '@discordjs/rest';
import { DiscordService } from './discord.service';
import { DiscordBotService, DISCORD_REST } from './discord-bot.service';
import { config } from '../config/config';

@Module({
  imports: [HttpModule],
  providers: [
    DiscordService,
    {
      provide: DISCORD_REST,
      useFactory: () =>
        new REST({ version: '10' }).setToken(config.discord.botToken ?? ''),
    },
    DiscordBotService,
  ],
  exports: [DiscordService, DiscordBotService],
})
export class DiscordModule {}
```

- [ ] **Step 2: Criar `donation-roles.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { CentralCartApiModule } from '../central-cart-api/central-cart-api.module';
import { DiscordModule } from '../discord/discord.module';
import { DonationTierService } from './donation-tier.service';
import { DonationRolesService } from './donation-roles.service';
import { DonationRolesController } from './donation-roles.controller';

@Module({
  imports: [CentralCartApiModule, DiscordModule],
  controllers: [DonationRolesController],
  providers: [DonationTierService, DonationRolesService],
  exports: [DonationRolesService],
})
export class DonationRolesModule {}
```

> `CentralCartApiModule` já exporta `CentralCartApiService` (confirmado), então o import acima basta.

- [ ] **Step 3: `webhook.module.ts` — importar DonationRolesModule**

Conteúdo final (o atual importa só `[DiscordModule]`; adicionamos `DonationRolesModule`):

```ts
import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { DiscordModule } from '../discord/discord.module';
import { DonationRolesModule } from '../donation-roles/donation-roles.module';

@Module({
  imports: [DiscordModule, DonationRolesModule],
  controllers: [WebhookController],
})
export class WebhookModule {}
```

- [ ] **Step 4: `app.module.ts` — registrar DonationRolesModule**

Adicionar `DonationRolesModule` ao array `imports` (após `WebhookModule`):

```ts
import { DonationRolesModule } from './donation-roles/donation-roles.module';
// ...
    WebhookModule,
    DonationRolesModule,
    HealthModule,
```

- [ ] **Step 5: Build + suíte completa**

Run: `npm run build && npm test`
Expected: build ok; todos os specs passam.

- [ ] **Step 6: Commit**

```bash
git add src/discord/discord.module.ts src/donation-roles/donation-roles.module.ts src/webhook/webhook.module.ts src/app.module.ts
git commit -m "feat(donation-roles): wiring dos módulos (REST do bot, DonationRolesModule)"
```

---

## Task 10: Hardening — proteger rotas de top-customers

**Files:**
- Modify: `src/central-cart-api/central-cart-api.controller.ts`

- [ ] **Step 1: Aplicar `ApiKeyGuard` no controller**

Adicionar imports e o decorator no controller:

```ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
// ...
@Controller('central-cart-api')
@UseGuards(ApiKeyGuard)
export class CentralCartApiController {
```

- [ ] **Step 2: Verificar build/lint**

Run: `npm run lint && npm run build`
Expected: ok.

- [ ] **Step 3: Commit**

```bash
git add src/central-cart-api/central-cart-api.controller.ts
git commit -m "fix(security): exige API key nas rotas de top-customers (expunham recebimentos)"
```

---

## Task 11: Teste e2e do webhook de ordem

**Files:**
- Create: `test/donation-roles.e2e-spec.ts`

> Confirme em `test/jest-e2e.json` o `rootDir`/`testRegex` (o projeto roda e2e via `npm run test:e2e`). Coloque o arquivo onde os outros e2e vivem.

- [ ] **Step 1: Escrever o teste e2e**

```ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { CentralCartApiService } from '../src/central-cart-api/central-cart-api.service';
import { DiscordBotService } from '../src/discord/discord-bot.service';

const SECRET = 'whsec_e2e';

describe('Webhook ORDER_APPROVED (e2e)', () => {
  let app: INestApplication;
  const getUserSpent = jest.fn().mockResolvedValue({ totalNetReceived: 200, totalGrossReceived: 200 });
  const getMemberRoleIds = jest.fn().mockResolvedValue([]);
  const addRole = jest.fn().mockResolvedValue(undefined);
  const removeRole = jest.fn().mockResolvedValue(undefined);
  const sendDirectMessage = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    process.env.CENTRALCART_ORDER_WEBHOOK_SECRET = SECRET;
    process.env.DISCORD_GUILD_ID = 'guild-e2e';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CentralCartApiService)
      .useValue({ getUserSpent })
      .overrideProvider(DiscordBotService)
      .useValue({ getMemberRoleIds, addRole, removeRole, sendDirectMessage })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('assinatura válida → aplica tier e responde 201', async () => {
    const body = JSON.stringify({
      id: 'evt-e2e',
      event: 'ORDER_APPROVED',
      date: new Date().toISOString(),
      data: { client_discord: '999', client_email: 'a@b.com', status: 'APPROVED' },
    });
    const ts = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', SECRET).update(`${ts}.${body}`).digest('hex');

    await request(app.getHttpServer())
      .post('/webhook/centralcart/order')
      .set('Content-Type', 'application/json')
      .set('x-centralcart-timestamp', ts)
      .set('x-centralcart-signature', signature)
      .send(body)
      .expect(201);

    expect(addRole).toHaveBeenCalledWith('999', expect.any(String));
  });

  it('assinatura inválida → 401', async () => {
    const body = JSON.stringify({ id: 'x', event: 'ORDER_APPROVED', data: {} });
    const ts = String(Math.floor(Date.now() / 1000));

    await request(app.getHttpServer())
      .post('/webhook/centralcart/order')
      .set('Content-Type', 'application/json')
      .set('x-centralcart-timestamp', ts)
      .set('x-centralcart-signature', 'invalida')
      .send(body)
      .expect(401);
  });
});
```

> Nota: o `setup-e2e.ts` (Jest `setupFiles`) já injeta as envs obrigatórias do boot (`CENTRAL_CART_API_TOKEN`, `DISCORD_WEBHOOK_URL`). Este teste apenas adiciona as específicas da feature.
>
> Se `createNestApplication({ rawBody: true })` não casar com a assinatura do seu Nest 11, use `moduleRef.createNestApplication(undefined, { rawBody: true })`. Verifique qual sobrecarga compila.

- [ ] **Step 2: Rodar o e2e**

Run: `npm run test:e2e`
Expected: PASS nos dois casos.

- [ ] **Step 3: Commit**

```bash
git add test/donation-roles.e2e-spec.ts
git commit -m "test(donation-roles): e2e do webhook ORDER_APPROVED (assinatura válida/inválida)"
```

---

## Task 12: Documentação e infraestrutura

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docker-compose*.yml` / `Dockerfile` (apenas se listarem envs explicitamente)

- [ ] **Step 1: `.env.example` — novas variáveis**

Adicionar (com comentários):

```dotenv
# --- Cargos por meta de doação (Discord bot) ---
# Token do bot do Discord (precisa de Manage Roles; cargo do bot acima dos cargos de meta)
DISCORD_BOT_TOKEN=
# ID do servidor (guild) onde os cargos vivem
DISCORD_GUILD_ID=
# Secret HMAC do webhook ORDER_APPROVED (gerado no painel da Central Cart)
CENTRALCART_ORDER_WEBHOOK_SECRET=
# (Opcional) sobrescreve os IDs de cargo por tier
DONATION_TIER_1_ROLE_ID=
DONATION_TIER_2_ROLE_ID=
DONATION_TIER_3_ROLE_ID=
```

- [ ] **Step 2: `README.md` e `CLAUDE.md` — documentar a feature**

No README: nova seção "Cargos por meta de doação" descrevendo o fluxo (webhook `ORDER_APPROVED` → `user_spent` → cargo por tier + DM), os endpoints novos (`POST /webhook/centralcart/order`, `POST /donations/sync`) e os pré-requisitos do bot.

No `CLAUDE.md` (seção Endpoints e Arquitetura): registrar o novo módulo `DonationRolesModule`, o endpoint admin e a mudança de que `central-cart-api/top-customers` agora exige `x-api-key`.

- [ ] **Step 3: Verificar envs no compose/Dockerfile**

Se o `docker-compose` de produção lista envs explicitamente, acrescentar `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `CENTRALCART_ORDER_WEBHOOK_SECRET` (e opcionais de role). Não há volume novo (stateless).

- [ ] **Step 4: Commit**

```bash
git add .env.example README.md CLAUDE.md
git commit -m "docs(donation-roles): documenta envs, endpoints e pré-requisitos do bot"
```

---

## Verificação final (antes do PR)

- [ ] `npm run lint` — sem erros.
- [ ] `npm test` — todos os specs passam.
- [ ] `npm run test:e2e` — e2e passa.
- [ ] `npm run build` — compila.
- [ ] Revisar o diff completo com a skill `requesting-code-review` + subagent `code-reviewer`.
- [ ] Segurança: subagent `cybersecurity-validator` (foco: rotas protegidas, HMAC, sem secrets vazados).
- [ ] Confirmar com o Murilo os pré-requisitos operacionais (bot, guild, secret, webhook na Central Cart) antes de mergear — **merge na `main` dispara deploy automático**.

---

## Notas para o executor (riscos conhecidos)

1. **Unidade do timestamp do webhook** (segundos vs ms): o guard aceita ambos (divide por 1000 se `> 1e12`). Validar com um payload real da Central Cart na primeira execução em produção.
2. **rawBody no e2e**: a sobrecarga de `createNestApplication` para `rawBody` pode variar; o plano traz o fallback. Se o e2e de assinatura falhar por body divergente, garanta que o HMAC é calculado sobre a **mesma string** enviada por `supertest` (envie string crua, não objeto).
3. **`@discordjs/rest` 404**: o guard `isNotFound` checa `.status === 404` (compatível com `DiscordAPIError`). Se a versão lançar `HTTPError` sem `.status`, ajustar o type guard.
4. **DM 403**: esperado quando o usuário bloqueia DMs; é best-effort e não interrompe o cargo.
