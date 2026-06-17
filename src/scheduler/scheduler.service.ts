import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { APIEmbed } from 'discord-api-types/v10';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { DiscordService } from '../discord/discord.service';
import { ImageGeneratorService } from '../image-generator/image-generator.service';
import { TopCustomerView } from '../central-cart-api/dto/top-customer.dto';
import {
  APP_TIMEZONE,
  getPreviousMonthLabel,
} from '../common/utils/month-range';

const TOP_DONATORS_LIMIT = 3;
const MONTHLY_CRON = '0 0 1 * *'; // dia 1 de cada mes, 00:00

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly centralCartApiService: CentralCartApiService,
    private readonly discordService: DiscordService,
    private readonly imageGeneratorService: ImageGeneratorService,
  ) {}

  // Executa todo dia 1 de cada mes as 00:00 (America/Sao_Paulo).
  @Cron(MONTHLY_CRON, { timeZone: APP_TIMEZONE })
  async sendMonthlyTopDonators(): Promise<void> {
    try {
      this.logger.log('Iniciando envio dos top doadores do mês anterior');

      const topCustomers =
        await this.centralCartApiService.getTopCustomersFromPreviousMonth();
      const displayMonth = getPreviousMonthLabel(new Date());

      await this.dispatchTopDonators(topCustomers, displayMonth);
    } catch (error) {
      // O cron engole a excecao para nao derrubar o agendador.
      this.logger.error('Erro ao enviar top doadores', error);
    }
  }

  // Disparo manual com periodo customizado; propaga erro para o controller.
  async sendTopDonatorsCustomDate(
    from: string,
    to: string,
    monthName?: string,
  ): Promise<void> {
    this.logger.log(`Enviando top doadores de ${from} a ${to}`);

    const topCustomers = await this.centralCartApiService.getTopCustomers(
      from,
      to,
    );
    const displayMonth = monthName ?? `${from} a ${to}`;

    await this.dispatchTopDonators(topCustomers, displayMonth);
  }

  async sendTopDonatorsNow(): Promise<void> {
    return this.sendMonthlyTopDonators();
  }

  // Fluxo comum: limita ao top N, gera a imagem, monta o embed e envia.
  private async dispatchTopDonators(
    customers: TopCustomerView[],
    displayMonth: string,
  ): Promise<void> {
    if (customers.length === 0) {
      this.logger.warn('Nenhum doador encontrado');
      return;
    }

    const top = customers.slice(0, TOP_DONATORS_LIMIT);
    const imageBuffer =
      await this.imageGeneratorService.generateTopDonatorsImage(
        top,
        displayMonth,
      );
    const embed = this.createEmbed(displayMonth);

    await this.discordService.sendImageWithEmbed(imageBuffer, embed);
    this.logger.log('Top doadores enviados com sucesso!');
  }

  private createEmbed(displayMonth: string): APIEmbed {
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
}
