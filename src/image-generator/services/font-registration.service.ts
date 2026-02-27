import { Injectable, Logger } from '@nestjs/common';
import { GlobalFonts } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';

export interface FontConfig {
  name: string;
  fileName: string;
  family: string;
}

@Injectable()
export class FontRegistrationService {
  private readonly logger = new Logger(FontRegistrationService.name);
  private static registeredFonts = new Set<string>();

  readonly MINECRAFT_TEN: FontConfig = {
    name: 'MinecraftTen',
    fileName: 'MinecraftTen-VGORe.ttf',
    family: 'MinecraftTen-VGORe',
  };

  readonly MONOCRAFT: FontConfig = {
    name: 'Monocraft',
    fileName: 'Monocraft.ttf',
    family: 'Monocraft',
  };

  constructor() {
    this.registerFont(this.MINECRAFT_TEN);
    this.registerFont(this.MONOCRAFT);
  }

  private registerFont(config: FontConfig): void {
    if (FontRegistrationService.registeredFonts.has(config.family)) {
      return;
    }

    try {
      const fontPath = path.join(process.cwd(), 'assets', config.fileName);
      this.logger.log(`Registrando fonte ${config.name} em: ${fontPath}`);

      if (!fs.existsSync(fontPath)) {
        this.logger.warn(`❌ Arquivo de fonte não encontrado: ${fontPath}`);
        return;
      }

      GlobalFonts.registerFromPath(fontPath, config.family);
      FontRegistrationService.registeredFonts.add(config.family);
      this.logger.log(`✅ Fonte ${config.name} registrada com sucesso!`);
    } catch (err) {
      this.logger.error(`❌ Erro ao registrar fonte ${config.name}:`, err);
    }
  }

  isFontRegistered(family: string): boolean {
    return FontRegistrationService.registeredFonts.has(family);
  }

  getFontFamily(config: FontConfig): string {
    return this.isFontRegistered(config.family) ? config.family : 'Arial';
  }
}
