import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MinecraftSkinService {
  private readonly logger = new Logger(MinecraftSkinService.name);
  private readonly MOJANG_API_URL =
    'https://api.mojang.com/users/profiles/minecraft';
  private readonly CRAFATAR_API_URL = 'https://crafatar.com/renders/head';
  private readonly VISAGE_API_URL = 'https://visage.surgeplay.com/head/512';
  private readonly STEVE_UUID = '8667ba71b85a4004af54457a9734eed7';
  private readonly DEFAULT_SCALE = 10;

  async getPlayerSkin(username: string): Promise<Buffer> {
    try {
      this.logger.log(`Buscando skin para: ${username}`);
      const uuid = await this.getPlayerUUID(username);

      // Tentar Crafatar primeiro
      try {
        return await this.fetchSkinFromCrafatar(uuid);
      } catch (craftarError) {
        this.logger.warn(`Crafatar falhou, tentando Visage`);
        
        // Fallback para Visage
        try {
          return await this.fetchSkinFromVisage(uuid);
        } catch (visageError) {
          this.logger.warn(`Visage também falhou, usando Steve`);
          return await this.getDefaultSkin();
        }
      }
    } catch (error) {
      this.logger.warn(
        `⚠️ Erro ao buscar UUID para ${username}, usando Steve`,
      );
      return await this.getDefaultSkin();
    }
  }

  private async getPlayerUUID(username: string): Promise<string> {
    try {
      const response = await axios.get(`${this.MOJANG_API_URL}/${username}`, {
        timeout: 8000,
        headers: {
          'User-Agent': 'Chrome/54',
        },
      });
      const uuid = response.data.id;
      this.logger.log(`✅ UUID encontrado para ${username}: ${uuid}`);
      return uuid;
    } catch (error) {
      this.logger.error(`Erro ao buscar UUID para ${username}:`, error.message);
      throw error;
    }
  }

  private async fetchSkinFromCrafatar(uuid: string): Promise<Buffer> {
    try {
      const response = await axios.get(
        `${this.CRAFATAR_API_URL}/${uuid}?overlay=true&scale=${this.DEFAULT_SCALE}`,
        {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Chrome/54',
          },
          validateStatus: (status) => status === 200, // Só aceitar 200
        },
      );
      this.logger.log(`✅ Skin carregada com sucesso do Crafatar`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.warn(`Crafatar retornou erro: ${error.message}`);
      throw error;
    }
  }

  private async fetchSkinFromVisage(uuid: string): Promise<Buffer> {
    try {
      const response = await axios.get(
        `${this.VISAGE_API_URL}/${uuid}?y=70`,
        {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Chrome/54',
          },
          validateStatus: (status) => status === 200,
        },
      );
      this.logger.log(`✅ Skin carregada com sucesso do Visage`);
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Visage retornou erro: ${error.message}`);
      throw error;
    }
  }

  private async getDefaultSkin(): Promise<Buffer> {
    this.logger.log('Buscando skin padrão (Steve)');
    try {
      // Tentar Crafatar primeiro
      return await this.fetchSkinFromCrafatar(this.STEVE_UUID);
    } catch {
      try {
        // Fallback para Visage
        this.logger.log('Crafatar Steve falhou, tentando Visage Steve');
        return await this.fetchSkinFromVisage(this.STEVE_UUID);
      } catch {
        // Último recurso: gerar imagem placeholder
        this.logger.error('Todas as APIs falharam, usando fallback local');
        return this.generateFallbackSkin();
      }
    }
  }

  private generateFallbackSkin(): Buffer {
    // Retornar um buffer vazio que será tratado no image-generator
    this.logger.warn('Gerando skin fallback local (placeholder)');
    return Buffer.from([]);
  }
}
