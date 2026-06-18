/**
 * Roda via `setupFiles` do Jest, ANTES de qualquer import dos specs — portanto
 * antes do AppModule ser carregado e do ConfigModule validar o ambiente.
 *
 * Garante as variaveis obrigatorias em ambientes sem arquivo .env (ex.: CI),
 * sem sobrescrever valores reais ja presentes no ambiente.
 */
process.env.CENTRAL_CART_API_TOKEN ||= 'test-token';
process.env.DISCORD_WEBHOOK_URL ||= 'https://discord.test/webhook';
process.env.SCHEDULER_API_KEY ||= 'test-key';
