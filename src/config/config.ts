export const config = {
  centralCart: {
    apiUrl:
      process.env.CENTRAL_CART_API_URL || 'https://api.centralcart.com.br/v1',
    bearerToken: process.env.CENTRAL_CART_API_TOKEN,
    storeId: process.env.CENTRAL_CART_STORE_ID || 'loja.austv.net',
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    updatesWebhookUrl: process.env.DISCORD_UPDATES_WEBHOOK_URL,
    channelId: process.env.DISCORD_CHANNEL_ID,
    botToken: process.env.DISCORD_BOT_TOKEN,
    // Cuidado, não exponha o token do bot em ambientes públicos!
  
  },
};