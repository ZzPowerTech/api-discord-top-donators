import { Injectable, Logger } from '@nestjs/common';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';
import { TopCustomerDto } from '../central-cart-api/dto/top-customer.dto';
import { MinecraftSkinService } from './services/minecraft-skin.service';
import { FontRegistrationService } from './services/font-registration.service';
import { CanvasRendererService } from './services/canvas-renderer.service';
import {
  CANVAS_CONFIG,
  POSITIONS,
  FOOTER_CONFIG,
  TITLE_CONFIG,
  SUBTITLE_CONFIG,
  RANK_COLORS,
} from './config/image.config';

@Injectable()
export class ImageGeneratorService {
  private readonly logger = new Logger(ImageGeneratorService.name);

  constructor(
    private readonly skinService: MinecraftSkinService,
    private readonly fontService: FontRegistrationService,
    private readonly canvasRenderer: CanvasRendererService,
  ) {}

  async generateTopDonatorsImage(
    topCustomers: TopCustomerDto[],
    month: string,
  ): Promise<string> {
    const canvas = createCanvas(CANVAS_CONFIG.width, CANVAS_CONFIG.height);
    const ctx = canvas.getContext('2d');

    // Renderizar background
    this.canvasRenderer.applyGradientBackground(ctx);

    // Renderizar título
    this.renderTitle(ctx);

    // Renderizar subtítulo
    this.renderSubtitle(ctx, month);

    // Preparar e ordenar top 3
    const orderedCustomers = this.prepareTopThree(topCustomers);

    // Renderizar jogadores
    await this.renderPlayers(ctx, orderedCustomers);

    // Renderizar footer
    await this.renderFooter(ctx);

    // Salvar imagem
    return this.saveImage(canvas);
  }

  private renderTitle(ctx: any): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MINECRAFT_TEN,
    );
    this.canvasRenderer.drawTextWithShadow(
      ctx,
      TITLE_CONFIG.text,
      TITLE_CONFIG.position.x,
      TITLE_CONFIG.position.y,
      TITLE_CONFIG.size,
      fontFamily,
      TITLE_CONFIG.color,
      true,
    );
  }

  private renderSubtitle(ctx: any, month: string): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MONOCRAFT,
    );
    ctx.font = `${SUBTITLE_CONFIG.size}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = SUBTITLE_CONFIG.color;
    ctx.fillText(month, SUBTITLE_CONFIG.position.x, SUBTITLE_CONFIG.position.y);
  }

  private prepareTopThree(topCustomers: TopCustomerDto[]): TopCustomerDto[] {
    const top3 = [...topCustomers.slice(0, 3)];

    // Preencher com N/A se necessário
    while (top3.length < 3) {
      top3.push({
        username: 'N/A',
        spent: 'R$ 0,00',
        purchases: 0,
        identifier: '',
        position: top3.length + 1,
        totalNumeric: 0,
      });
    }

    // Ordenar para [2º, 1º, 3º]
    return [top3[1], top3[0], top3[2]];
  }

  private async renderPlayers(
    ctx: any,
    orderedCustomers: TopCustomerDto[],
  ): Promise<void> {
    for (let i = 0; i < POSITIONS.length; i++) {
      const pos = POSITIONS[i];
      const customer = orderedCustomers[i];

      if (customer.username === 'N/A') continue;

      await this.renderPlayer(ctx, customer, pos);
    }
  }

  private async renderPlayer(
    ctx: any,
    customer: TopCustomerDto,
    position: any,
  ): Promise<void> {
    try {
      // Carregar e desenhar skin
      const headBuffer = await this.skinService.getPlayerSkin(
        customer.username,
      );
      const headImage = await loadImage(headBuffer);

      this.canvasRenderer.drawImageWithShadow(
        ctx,
        headImage,
        position.x - position.size / 2,
        position.y - position.size / 2,
        position.size,
        position.size,
      );

      // Renderizar textos
      this.renderPlayerTexts(ctx, customer.username, position);
    } catch (error) {
      this.logger.error(
        `Erro ao renderizar jogador ${customer.username}:`,
        error,
      );
    }
  }

  private renderPlayerTexts(ctx: any, username: string, position: any): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MINECRAFT_TEN,
    );

    // Rank
    const rankY = position.y + position.size / 2 + 40;
    const rankColor =
      position.rank === 1 ? RANK_COLORS.white : RANK_COLORS.white;
    const rankSize = position.rank === 1 ? 85 : 70;

    this.canvasRenderer.drawTextWithShadow(
      ctx,
      `TOP #${position.rank}`,
      position.x,
      rankY,
      rankSize,
      fontFamily,
      rankColor,
      true,
    );

    // Nome - cor específica por posição
    const nameY = rankY + 90;
    const nameSize = position.rank === 1 ? 65 : 56;
    const nameColor =
      position.rank === 1
        ? RANK_COLORS.position1
        : position.rank === 2
          ? RANK_COLORS.position2
          : RANK_COLORS.position3;

    this.canvasRenderer.drawTextWithShadow(
      ctx,
      username.toUpperCase(),
      position.x,
      nameY,
      nameSize,
      fontFamily,
      nameColor,
      true,
      2, // letterSpacing de 2px para melhorar legibilidade
    );
  }

  private async renderFooter(ctx: any): Promise<void> {
    const footerY = this.canvasRenderer.drawFooter(
      ctx,
      FOOTER_CONFIG.height,
      FOOTER_CONFIG.backgroundColor,
    );

    try {
      const logoPath = path.join(process.cwd(), 'assets', 'austv-logo.png');

      if (fs.existsSync(logoPath)) {
        const logo = await loadImage(logoPath);
        const logoHeight = (logo.height * FOOTER_CONFIG.logoWidth) / logo.width;
        const logoY = footerY / 1.07;
        ctx.drawImage(
          logo,
          CANVAS_CONFIG.width / 2 - FOOTER_CONFIG.logoWidth / 2,
          logoY,
          FOOTER_CONFIG.logoWidth,
          logoHeight,
        );
      } else {
        this.renderFallbackLogo(ctx, footerY);
      }
    } catch (error) {
      this.logger.warn('Logo não encontrada, usando texto');
      this.renderFallbackLogo(ctx, footerY);
    }
  }

  private renderFallbackLogo(ctx: any, footerY: number): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MINECRAFT_TEN,
    );
    this.canvasRenderer.drawTextWithShadow(
      ctx,
      'AUSTV',
      CANVAS_CONFIG.width / 2,
      footerY + FOOTER_CONFIG.height / 5,
      60,
      fontFamily,
      '#FFFFFF',
      false,
    );
  }

  private saveImage(canvas: any): string {
    const outputPath = path.join(process.cwd(), 'temp', 'top-donators.png');
    const dir = path.dirname(outputPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    this.logger.log(`Imagem gerada: ${outputPath}`);
    return outputPath;
  }
}
