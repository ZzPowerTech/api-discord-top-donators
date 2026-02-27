# 🏆 API Discord Top Donators

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord" />
</p>

## 📝 Descrição

API automatizada para geração e publicação mensal do ranking dos **Top 3 Doadores** no Discord. O sistema integra-se com a API do Central Cart para buscar dados de clientes da [loja AUSTV](https://loja.austv.net), gera imagens personalizadas com skins do Minecraft e envia automaticamente via webhook do Discord.

Além disso, o sistema também realiza a **postagem automática dos conteúdos publicados no blog do servidor**, mantendo a comunidade sempre informada sobre novidades, atualizações e anúncios.

## ✨ Funcionalidades

### 🏆 Top Doadores

- 🔄 **Publicação Automática Mensal**: Execução agendada todo dia 1º de cada mês às 00:00 (horário de Brasília)
- 🎨 **Geração de Imagens**: Criação de imagens customizadas com:
  - Skins do Minecraft renderizadas em 3D
  - Design com gradiente e cores personalizadas por posição
  - Fontes temáticas do Minecraft
  - Exibição do valor gasto por jogador
- 📊 **Integração Central Cart API**: Busca automática dos top clientes do mês anterior da [loja AUSTV](https://loja.austv.net)

### 📰 Blog do Servidor

- 📝 **Postagem Automática**: Publica automaticamente os novos conteúdos do blog no Discord
- 🔍 **Monitoramento Contínuo**: Verifica periodicamente novas publicações
- 📢 **Notificações Instantâneas**: Mantém a comunidade informada sobre atualizações e anúncios

### ⚙️ Recursos Gerais

- 🤖 **Webhook Discord**: Envio de embeds formatados com imagens anexadas
- 🔧 **Endpoints Manuais**: Possibilidade de trigger manual via webhook/API
- 📅 **Agendamento Inteligente**: Sistema de scheduler com cron jobs

## 🛠 Tecnologias

- **[NestJS](https://nestjs.com/)** - Framework Node.js progressivo
- **[TypeScript](https://www.typescriptlang.org/)** - Linguagem de programação
- **[@nestjs/schedule](https://docs.nestjs.com/techniques/task-scheduling)** - Agendamento de tarefas
- **[@nestjs/axios](https://docs.nestjs.com/techniques/http-module)** - Cliente HTTP
- **[@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)** - Geração de imagens
- **[Discord.js](https://discord.js.org/)** - Integração com Discord
- **[Axios](https://axios-http.com/)** - Requisições HTTP

## 📦 Instalação

```bash
# Instalar dependências
npm install
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis (use o arquivo `.env.example` como template):

```env
# API Central Cart
CENTRAL_CART_API_URL=https://api.centralcart.com.br/v1
CENTRAL_CART_API_TOKEN=seu_token_aqui
CENTRAL_CART_STORE_ID=loja.austv.net

# Discord
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
DISCORD_UPDATES_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
DISCORD_CHANNEL_ID=seu_channel_id_aqui
DISCORD_BOT_TOKEN=seu_bot_token_aqui
```

> ⚠️ **Importante**: Nunca commite o arquivo `.env` no repositório. Ele já está incluído no `.gitignore`.

## 🚀 Executando a Aplicação

```bash
# Desenvolvimento
npm run start

# Modo watch (desenvolvimento)
npm run start:dev

# Produção
npm run start:prod
```

## 📁 Estrutura do Projeto

```
src/
├── central-cart-api/      # Integração com Central Cart
│   ├── dto/              # Data Transfer Objects
│   └── central-cart-api.service.ts
├── discord/              # Serviço do Discord
│   └── discord.service.ts
├── image-generator/      # Geração de imagens
│   ├── services/        # Serviços auxiliares
│   │   ├── canvas-renderer.service.ts
│   │   ├── font-registration.service.ts
│   │   └── minecraft-skin.service.ts
│   └── config/          # Configurações de layout
├── scheduler/           # Agendamento de tarefas
│   └── scheduler.service.ts
└── webhook/            # Endpoints de webhook
```

## 🔄 Agendamento

O sistema executa automaticamente no dia 1º de cada mês às 00:00 (horário de São Paulo/Brasília). O cron job está configurado em:

```typescript
@Cron('0 0 1 * *', { timeZone: 'America/Sao_Paulo' })
```

## 🎨 Personalização de Imagens

As imagens são geradas com:

- Resolução: 1200x800px
- Background: Gradiente preto com transparência
- Fontes: MinecraftTen e Monocraft
- Cores por posição:
  - 🥇 1º lugar: Dourado (#FFD700)
  - 🥈 2º lugar: Prata (#C0C0C0)
  - 🥉 3º lugar: Bronze (#CD7F32)

## 📡 Endpoints

### GET `/scheduler/trigger-monthly-post`

Executa manualmente o envio do ranking mensal.

**Resposta:**

```json
{
  "message": "Post mensal executado com sucesso"
}
```

### POST `/webhook`

Endpoint para receber webhooks externos.

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## 📝 Scripts Úteis

```bash
# Formatar código
npm run format

# Lint e correção automática
npm run lint

# Build para produção
npm run build
```

## 🐳 Docker

```dockerfile
# Build da imagem
docker build -t api-discord-top-donators .

# Executar container
docker run -p 3000:3000 --env-file .env api-discord-top-donators
```

## 📄 Licença

UNLICENSED - Projeto privado

## � Links

- [Loja AUSTV](https://loja.austv.net)

## 👥 Autor

Desenvolvido para automação de reconhecimento de doadores e divulgação de conteúdos do servidor AUSTV.
