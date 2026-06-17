export const config = {
  app: {
    get port(): number {
      const parsed = process.env.PORT
        ? Number.parseInt(process.env.PORT, 10)
        : NaN;
      return Number.isNaN(parsed) ? 3333 : parsed;
    },
    get version(): string {
      return process.env.APP_VERSION ?? '0.0.0';
    },
  },
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
