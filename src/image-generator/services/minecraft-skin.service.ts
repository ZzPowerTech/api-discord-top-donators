import { Injectable, Logger } from '@nestjs/common';
import { createCanvas } from '@napi-rs/canvas';
import axios from 'axios';
import { getErrorMessage } from '../../common/utils/get-error-message';

const MOJANG_API_URL = 'https://api.mojang.com/users/profiles/minecraft';
const CRAFATAR_API_URL = 'https://crafatar.com/renders/head';
const VISAGE_API_URL = 'https://visage.surgeplay.com/head/512';
const STEVE_UUID = '8667ba71b85a4004af54457a9734eed7';
const CRAFATAR_SCALE = 10;
const VISAGE_Y = 70;
const MOJANG_TIMEOUT_MS = 8000;
const SKIN_TIMEOUT_MS = 10000;
const SKIN_USER_AGENT = 'Chrome/54';
const PLACEHOLDER_SIZE = 512;

@Injectable()
export class MinecraftSkinService {
  private readonly logger = new Logger(MinecraftSkinService.name);

  /**
   * Resolve a skin (cabeça 3D) de um jogador. Sempre retorna um Buffer PNG
   * valido: Crafatar -> Visage -> Steve -> placeholder local. Nunca lança.
   */
  async getPlayerSkin(username: string): Promise<Buffer> {
    try {
      this.logger.log(`Buscando skin para: ${username}`);
      const uuid = await this.getPlayerUUID(username);
      return await this.fetchSkinWithFallback(uuid);
    } catch {
      this.logger.warn(`Skin indisponível para ${username}, usando padrão`);
      return this.getDefaultSkin();
    }
  }

  private async getPlayerUUID(username: string): Promise<string> {
    try {
      const response = await axios.get<{ id: string }>(
        `${MOJANG_API_URL}/${encodeURIComponent(username)}`,
        {
          timeout: MOJANG_TIMEOUT_MS,
          headers: { 'User-Agent': SKIN_USER_AGENT },
        },
      );
      this.logger.log(`UUID encontrado para ${username}: ${response.data.id}`);
      return response.data.id;
    } catch (error) {
      this.logger.error(
        `Erro ao buscar UUID para ${username}: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }

  /** Tenta os provedores em ordem; lança se nenhum responder. */
  private async fetchSkinWithFallback(uuid: string): Promise<Buffer> {
    const providers: Array<(id: string) => Promise<Buffer>> = [
      (id) => this.fetchSkinFromCrafatar(id),
      (id) => this.fetchSkinFromVisage(id),
    ];

    for (const fetchSkin of providers) {
      try {
        return await fetchSkin(uuid);
      } catch {
        // tenta o proximo provedor
      }
    }

    throw new Error(`Nenhum provedor de skin respondeu para ${uuid}`);
  }

  private async getDefaultSkin(): Promise<Buffer> {
    try {
      return await this.fetchSkinWithFallback(STEVE_UUID);
    } catch {
      this.logger.warn('Provedores de skin indisponíveis, usando placeholder');
      return this.generateFallbackSkin();
    }
  }

  private async fetchSkinFromCrafatar(uuid: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(
      `${CRAFATAR_API_URL}/${uuid}?overlay=true&scale=${CRAFATAR_SCALE}`,
      {
        responseType: 'arraybuffer',
        timeout: SKIN_TIMEOUT_MS,
        headers: { 'User-Agent': SKIN_USER_AGENT },
        validateStatus: (status) => status === 200,
      },
    );
    this.logger.log('Skin carregada do Crafatar');
    return Buffer.from(response.data);
  }

  private async fetchSkinFromVisage(uuid: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(
      `${VISAGE_API_URL}/${uuid}?y=${VISAGE_Y}`,
      {
        responseType: 'arraybuffer',
        timeout: SKIN_TIMEOUT_MS,
        headers: { 'User-Agent': SKIN_USER_AGENT },
        validateStatus: (status) => status === 200,
      },
    );
    this.logger.log('Skin carregada do Visage');
    return Buffer.from(response.data);
  }

  /** Placeholder local (PNG valido) quando todas as fontes externas falham. */
  private generateFallbackSkin(): Buffer {
    const canvas = createCanvas(PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(0, 0, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE);
    ctx.fillStyle = '#cccccc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(PLACEHOLDER_SIZE * 0.6)}px sans-serif`;
    ctx.fillText('?', PLACEHOLDER_SIZE / 2, PLACEHOLDER_SIZE / 2);
    return canvas.toBuffer('image/png');
  }
}
