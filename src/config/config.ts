export const config = {
  centralCart: {
    get apiUrl() {
      return (
        process.env.CENTRAL_CART_API_URL || 'https://api.centralcart.com.br/v1'
      );
    },
    get bearerToken() {
      return process.env.CENTRAL_CART_API_TOKEN;
    },
    get storeId() {
      return process.env.CENTRAL_CART_STORE_ID || 'loja.austv.net';
    },
  },
  discord: {
    get webhookUrl() {
      return process.env.DISCORD_WEBHOOK_URL;
    },
    get updatesWebhookUrl() {
      return process.env.DISCORD_UPDATES_WEBHOOK_URL;
    },
    get channelId() {
      return process.env.DISCORD_CHANNEL_ID;
    },
    get botToken() {
      return process.env.DISCORD_BOT_TOKEN;
    },
  },
};