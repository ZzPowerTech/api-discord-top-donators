import { Injectable } from '@nestjs/common';
import { SKRSContext2D } from '@napi-rs/canvas';
import {
  CANVAS_CONFIG,
  GRADIENT_COLORS,
  SHADOW_CONFIG,
} from '../config/image.config';

@Injectable()
export class CanvasRendererService {
  applyGradientBackground(ctx: SKRSContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_CONFIG.height);
    gradient.addColorStop(0, GRADIENT_COLORS.start);
    gradient.addColorStop(0.5, GRADIENT_COLORS.middle);
    gradient.addColorStop(1, GRADIENT_COLORS.end);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_CONFIG.width, CANVAS_CONFIG.height);
  }

  drawTextWithShadow(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    size: number,
    fontFamily: string,
    color: string,
    shadow = true,
    letterSpacing = 0,
  ): void {
    ctx.font = `${size}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = `${letterSpacing}px`;

    if (shadow) {
      const shadowOffsetY = Math.max(4, Math.round(size / 12));
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillText(text, x, y + shadowOffsetY);
    }

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    
    // Reset letterSpacing
    ctx.letterSpacing = '0px';
  }

  drawImageWithShadow(
    ctx: SKRSContext2D,
    image: any,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    // Desenhar com sombra
    ctx.save();
    ctx.shadowColor = SHADOW_CONFIG.color;
    ctx.shadowBlur = SHADOW_CONFIG.blur;
    ctx.shadowOffsetX = SHADOW_CONFIG.offsetX;
    ctx.shadowOffsetY = SHADOW_CONFIG.offsetY;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();

    // Redesenhar sem sombra para nitidez
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, x, y, width, height);
    ctx.restore();
  }

  drawFooter(ctx: SKRSContext2D, height: number, backgroundColor: string): number {
    const footerY = CANVAS_CONFIG.height - height;
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, footerY, CANVAS_CONFIG.width, height);
    return footerY;
  }
}
