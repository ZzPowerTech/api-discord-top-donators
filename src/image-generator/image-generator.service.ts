import { Injectable, Logger } from '@nestjs/common';
import {
  Canvas,
  createCanvas,
  Image,
  loadImage,
  SKRSContext2D,
} from '@napi-rs/canvas';
import * as path from 'path';
import { TopCustomerView } from '../central-cart-api/dto/top-customer.dto';
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
  RANK_TEXT_CONFIG,
  LOGO_CONFIG,
  PLACEHOLDER_USERNAME,
  PlayerPosition,
} from './config/image.config';

@Injectable()
export class ImageGeneratorService {
  private readonly logger = new Logger(ImageGeneratorService.name);

  constructor(
    private readonly skinService: MinecraftSkinService,
    private readonly fontService: FontRegistrationService,
    private readonly canvasRenderer: CanvasRendererService,
  ) {}

  /** Gera o PNG do pódio e retorna o buffer (sem persistir em disco). */
  async generateTopDonatorsImage(
    topCustomers: TopCustomerView[],
    month: string,
  ): Promise<Buffer> {
    const canvas = createCanvas(CANVAS_CONFIG.width, CANVAS_CONFIG.height);
    const ctx = canvas.getContext('2d');

    this.canvasRenderer.applyGradientBackground(ctx);
    this.renderTitle(ctx);
    this.renderSubtitle(ctx, month);

    const orderedCustomers = this.prepareTopThree(topCustomers);
    await this.renderPlayers(ctx, orderedCustomers);
    await this.renderFooter(ctx);

    this.logger.log('Imagem dos top doadores gerada');
    return this.toPngBuffer(canvas);
  }

  private renderTitle(ctx: SKRSContext2D): void {
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

  private renderSubtitle(ctx: SKRSContext2D, month: string): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MONOCRAFT,
    );
    ctx.font = `${SUBTITLE_CONFIG.size}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = SUBTITLE_CONFIG.color;
    ctx.fillText(month, SUBTITLE_CONFIG.position.x, SUBTITLE_CONFIG.position.y);
  }

  private prepareTopThree(topCustomers: TopCustomerView[]): TopCustomerView[] {
    const top3 = topCustomers.slice(0, 3);

    // Preenche posicoes faltantes com placeholders N/A.
    while (top3.length < 3) {
      top3.push({
        username: PLACEHOLDER_USERNAME,
        spent: 'R$ 0,00',
        purchases: 0,
        identifier: '',
        position: top3.length + 1,
        totalNumeric: 0,
      });
    }

    // Ordena para a disposicao visual do podio: [2º, 1º, 3º].
    return [top3[1], top3[0], top3[2]];
  }

  private async renderPlayers(
    ctx: SKRSContext2D,
    orderedCustomers: TopCustomerView[],
  ): Promise<void> {
    for (let i = 0; i < POSITIONS.length; i++) {
      const position = POSITIONS[i];
      const customer = orderedCustomers[i];

      if (customer.username === PLACEHOLDER_USERNAME) {
        continue;
      }

      await this.renderPlayer(ctx, customer, position);
    }
  }

  private async renderPlayer(
    ctx: SKRSContext2D,
    customer: TopCustomerView,
    position: PlayerPosition,
  ): Promise<void> {
    try {
      const headBuffer = await this.skinService.getPlayerSkin(
        customer.username,
      );
      const headImage: Image = await loadImage(headBuffer);

      this.canvasRenderer.drawImageWithShadow(
        ctx,
        headImage,
        position.x - position.size / 2,
        position.y - position.size / 2,
        position.size,
        position.size,
      );

      this.renderPlayerTexts(ctx, customer.username, position);
    } catch (error) {
      this.logger.error(
        `Erro ao renderizar jogador ${customer.username}`,
        error,
      );
    }
  }

  private renderPlayerTexts(
    ctx: SKRSContext2D,
    username: string,
    position: PlayerPosition,
  ): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MINECRAFT_TEN,
    );
    const isFirst = position.rank === 1;

    const rankY = position.y + position.size / 2 + RANK_TEXT_CONFIG.rankOffsetY;
    const rankSize = isFirst
      ? RANK_TEXT_CONFIG.rankSizeFirst
      : RANK_TEXT_CONFIG.rankSizeOther;

    this.canvasRenderer.drawTextWithShadow(
      ctx,
      `TOP #${position.rank}`,
      position.x,
      rankY,
      rankSize,
      fontFamily,
      RANK_COLORS.white,
      true,
    );

    const nameY = rankY + RANK_TEXT_CONFIG.nameOffsetY;
    const nameSize = isFirst
      ? RANK_TEXT_CONFIG.nameSizeFirst
      : RANK_TEXT_CONFIG.nameSizeOther;
    const nameColor = this.resolveNameColor(position.rank);

    this.canvasRenderer.drawTextWithShadow(
      ctx,
      username.toUpperCase(),
      position.x,
      nameY,
      nameSize,
      fontFamily,
      nameColor,
      true,
      RANK_TEXT_CONFIG.nameLetterSpacing,
    );
  }

  private resolveNameColor(rank: number): string {
    if (rank === 1) {
      return RANK_COLORS.position1;
    }
    return rank === 2 ? RANK_COLORS.position2 : RANK_COLORS.position3;
  }

  private async renderFooter(ctx: SKRSContext2D): Promise<void> {
    const footerY = this.canvasRenderer.drawFooter(
      ctx,
      FOOTER_CONFIG.height,
      FOOTER_CONFIG.backgroundColor,
    );

    try {
      const logoPath = path.join(process.cwd(), 'assets', 'austv-logo.png');
      const logo = await loadImage(logoPath);
      const logoHeight = (logo.height * FOOTER_CONFIG.logoWidth) / logo.width;
      const logoY = footerY / LOGO_CONFIG.yDivisor;

      ctx.drawImage(
        logo,
        CANVAS_CONFIG.width / 2 - FOOTER_CONFIG.logoWidth / 2,
        logoY,
        FOOTER_CONFIG.logoWidth,
        logoHeight,
      );
    } catch {
      this.logger.warn('Logo não encontrada, usando texto');
      this.renderFallbackLogo(ctx, footerY);
    }
  }

  private renderFallbackLogo(ctx: SKRSContext2D, footerY: number): void {
    const fontFamily = this.fontService.getFontFamily(
      this.fontService.MINECRAFT_TEN,
    );
    this.canvasRenderer.drawTextWithShadow(
      ctx,
      'AUSTV',
      CANVAS_CONFIG.width / 2,
      footerY + FOOTER_CONFIG.height / LOGO_CONFIG.fallbackTextDivisor,
      LOGO_CONFIG.fallbackTextSize,
      fontFamily,
      '#FFFFFF',
      false,
    );
  }

  private toPngBuffer(canvas: Canvas): Buffer {
    return canvas.toBuffer('image/png');
  }
}
