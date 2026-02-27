# 🔔 Alternativa: Webhook para Receber Posts

## ❌ Problema

A API CentralCart não possui um endpoint público para listar posts. Todos os endpoints tentados retornam 404.

## ✅ Solução Recomendada: Usar Webhooks

Ao invés de fazer polling (verificar a cada 5 minutos), configure um webhook que a CentralCart vai chamar automaticamente quando um novo post for criado.

## 🎯 Vantagens do Webhook

- ✅ **Tempo Real** - Notificação instantânea ao criar post
- ✅ **Eficiente** - Não faz requisições desnecessárias
- ✅ **Confiável** - A própria CentralCart notifica
- ✅ **Econômico** - Menos consumo de API

## 🛠️ Como Implementar

### 1. Criar Endpoint de Webhook

Já vou criar um controller para receber o webhook:

```typescript
// src/webhook/webhook.controller.ts
import { Controller, Post, Body, Headers } from '@nestjs/common';
import { DiscordService } from '../discord/discord.service';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly discordService: DiscordService) {}

  @Post('centralcart/post-created')
  async handlePostCreated(
    @Body() postData: any,
    @Headers('x-centralcart-signature') signature?: string,
  ) {
    // Validar signature se a CentralCart enviar
    // if (!this.validateSignature(postData, signature)) {
    //   throw new UnauthorizedException('Invalid signature');
    // }

    // Enviar para Discord
    await this.discordService.sendPostUpdate({
      title: postData.title,
      content: postData.content,
      image: postData.image,
    });

    return { success: true };
  }
}
```

### 2. Configurar na CentralCart

Entre no painel da CentralCart e configure:

**URL do Webhook:**

```
https://SEU_DOMINIO.com/webhook/centralcart/post-created
```

**Eventos:**

- ☑️ Post Criado
- ☑️ Post Publicado

### 3. Expor a Aplicação

Para receber webhooks, sua aplicação precisa estar acessível na internet:

#### Opção A: ngrok (para testes)

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 3000
ngrok http 3000
```

Copie a URL gerada (ex: `https://abc123.ngrok.io`) e configure na CentralCart:

```
https://abc123.ngrok.io/webhook/centralcart/post-created
```

#### Opção B: Deploy em Produção

- Heroku
- Railway
- Render
- Azure
- AWS

### 4. Testar Webhook

Crie um post no painel da CentralCart e veja se:

1. O webhook é chamado
2. Os logs mostram o recebimento
3. A mensagem é enviada para o Discord

## 📝 Estrutura do Payload

A CentralCart provavelmente envia algo como:

```json
{
  "event": "post.created",
  "data": {
    "id": 123,
    "title": "Título do Post",
    "content": "Conteúdo...",
    "image": "https://...",
    "created_at": "2026-01-25T15:30:00Z"
  }
}
```

## 🔐 Segurança

Para validar que o webhook vem realmente da CentralCart:

```typescript
private validateSignature(payload: any, signature: string): boolean {
  const crypto = require('crypto');
  const secret = process.env.CENTRALCART_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === expectedSignature;
}
```

## 🧪 Testar Manualmente

Você pode testar o endpoint manualmente:

```bash
curl -X POST http://localhost:3000/webhook/centralcart/post-created \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste de Post",
    "content": "Este é um teste",
    "image": "https://via.placeholder.com/400"
  }'
```

## 📞 Contato CentralCart

Entre em contato com o suporte da CentralCart e pergunte:

1. **Vocês têm webhook para quando um post é criado?**
2. **Qual é o formato do payload enviado?**
3. **Como validar a autenticidade do webhook?**
4. **Existe endpoint para listar posts via API?**

## 🔄 Próximos Passos

1. ✅ Verificar se a CentralCart suporta webhooks
2. ✅ Criar o endpoint de webhook (já implementado)
3. ✅ Expor a aplicação (ngrok ou deploy)
4. ✅ Configurar na CentralCart
5. ✅ Testar criando um post
6. ✅ Desabilitar o cron job de polling (economiza recursos)

## ⚠️ Se Webhooks Não Estiverem Disponíveis

Outras alternativas:

1. **RSS Feed** - Se o site tiver feed RSS
2. **Web Scraping** - Monitorar a página de posts (não recomendado)
3. **Integração Direta** - Se tiver acesso ao banco de dados
4. **Manual** - Endpoint para enviar posts manualmente
