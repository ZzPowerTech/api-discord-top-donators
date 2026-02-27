import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { DiscordService } from '../discord/discord.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly centralCartApiService: CentralCartApiService,
    private readonly discordService: DiscordService,
    private readonly imageGeneratorService: ImageGeneratorService,
  ) {}

  private createEmbed(displayMonth: string) {
    return {
      title: `🏆 Top 3 Doadores - ${displayMonth}`,
      description:
        '✨ **[Vocês são incríveis!](https://loja.austv.net)** ✨\n\nGraças ao apoio de cada um, conseguimos manter nossos serviços sempre online e com a melhor qualidade possível. Muito obrigado por fazerem parte dessa jornada! 💜',
      color: 0xffd700,
      image: {
        url: 'attachment://top-donators.png',
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Seu apoio faz toda a diferença! 🚀',
      },
    };
  }

  // Executa todo dia 1° de cada mês às 00:00
  @Cron('0 0 1 * *', {
    timeZone: 'America/Sao_Paulo',
  })

  
  async sendMonthlyTopDonators() {
    try {
      this.logger.log('Iniciando envio dos top doadores do mês anterior');

      // Buscar top customers do mês anterior
      const topCustomers =
        await this.centralCartApiService.getTopCustomersFromPreviousMonth();

      if (!topCustomers || topCustomers.length === 0) {
        this.logger.warn('Nenhum doador encontrado');
        return;
      }

      // Pegar apenas os 3 primeiros
      const top3 = topCustomers.slice(0, 3);

      // Obter nome do mês anterior
      const now = new Date();
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthName = previousMonth.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });

      // Gerar imagem
      const imagePath =
        await this.imageGeneratorService.generateTopDonatorsImage(
          top3,
          monthName.charAt(0).toUpperCase() + monthName.slice(1),
        );

      // Criar embed para Discord
      const embed = this.createEmbed(
        monthName.charAt(0).toUpperCase() + monthName.slice(1),
      );

      // Enviar para Discord
      await this.discordService.sendImageWithEmbed(imagePath, embed);

      this.logger.log('Top doadores enviados com sucesso!');
    } catch (error) {
      this.logger.error('Erro ao enviar top doadores', error);
    }
  }

  // Método para enviar com data customizada
  async sendTopDonatorsCustomDate(
    from: string,
    to: string,
    monthName?: string,
  ) {
    try {
      this.logger.log(`Enviando top doadores de ${from} a ${to}`);

      // Buscar top customers do período especificado
      const topCustomers = await this.centralCartApiService.getTopCustomers(
        from,
        to,
      );

      if (!topCustomers || topCustomers.length === 0) {
        this.logger.warn('Nenhum doador encontrado');
        return;
      }

      // Pegar apenas os 3 primeiros
      const top3 = topCustomers.slice(0, 3);

      // Usar nome do mês fornecido ou gerar automaticamente
      const displayMonth = monthName || `${from} a ${to}`;

      // Gerar imagem
      const imagePath =
        await this.imageGeneratorService.generateTopDonatorsImage(
          top3,
          displayMonth,
        );

      // Criar embed para Discord
      const embed = this.createEmbed(displayMonth);

      // Enviar para Discord
      await this.discordService.sendImageWithEmbed(imagePath, embed);

      this.logger.log('Top doadores enviados com sucesso!');
    } catch (error) {
      this.logger.error('Erro ao enviar top doadores', error);
      throw error;
    }
  }

  // Método para testar manualmente
  async sendTopDonatorsNow() {
    return this.sendMonthlyTopDonators();
  }
}
