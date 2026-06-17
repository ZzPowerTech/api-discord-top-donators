import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { DiscordService } from '../discord/discord.service';
import { PostDto } from '../central-cart-api/dto/post.dto';
import { config } from '../config/config';
import { APP_TIMEZONE } from '../common/utils/month-range';

const POSTS_CRON = '*/5 * * * *'; // a cada 5 minutos

@Injectable()
export class PostsMonitorService implements OnModuleInit {
  private readonly logger = new Logger(PostsMonitorService.name);
  private lastCheckedPostId: number | null = null;

  constructor(
    private readonly centralCartApiService: CentralCartApiService,
    private readonly discordService: DiscordService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Inicializa com o post mais recente para nao reenviar posts antigos.
    try {
      const posts = await this.fetchPostsSorted();
      if (posts.length > 0) {
        this.lastCheckedPostId = posts[0].id;
        this.logger.log(
          `Inicializado com o post ID: ${this.lastCheckedPostId}`,
        );
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar monitor de posts', error);
    }
  }

  @Cron(POSTS_CRON, { timeZone: APP_TIMEZONE })
  async checkNewPosts(): Promise<void> {
    try {
      this.logger.log('Verificando novos posts...');

      const posts = await this.fetchPostsSorted();
      if (posts.length === 0) {
        this.logger.log('Nenhum post encontrado');
        return;
      }

      const latestId = posts[0].id;

      // Primeira verificacao: apenas estabelece o baseline, sem enviar.
      if (this.lastCheckedPostId === null) {
        this.lastCheckedPostId = latestId;
        this.logger.log(`Primeiro check - Post ID: ${latestId}`);
        return;
      }

      const baseline = this.lastCheckedPostId;
      const newPosts = posts.filter((post) => post.id > baseline);

      if (newPosts.length === 0) {
        this.logger.log('Nenhum post novo encontrado');
        return;
      }

      this.logger.log(`${newPosts.length} novo(s) post(s) encontrado(s)`);

      // Envia do mais antigo para o mais novo (copia para nao mutar a lista).
      for (const post of [...newPosts].reverse()) {
        await this.sendPostToDiscord(post);
      }

      this.lastCheckedPostId = latestId;
    } catch (error) {
      this.logger.error('Erro ao verificar novos posts', error);
    }
  }

  async sendLatestPost(): Promise<void> {
    try {
      const posts = await this.fetchPostsSorted();
      if (posts.length === 0) {
        this.logger.warn('Nenhum post encontrado');
        return;
      }
      await this.sendPostToDiscord(posts[0]);
    } catch (error) {
      this.logger.error('Erro ao enviar último post', error);
      throw error;
    }
  }

  // Busca os posts e devolve uma copia ordenada por ID decrescente (imutavel).
  private async fetchPostsSorted(): Promise<PostDto[]> {
    const posts = await this.centralCartApiService.getPosts(
      config.centralCart.storeId,
    );
    return [...posts].sort((a, b) => b.id - a.id);
  }

  private async sendPostToDiscord(post: PostDto): Promise<void> {
    try {
      this.logger.log(`Enviando post "${post.title}" para o Discord`);

      await this.discordService.sendPostUpdate({
        title: post.title,
        content: post.content,
        image: post.image,
        author: post.author,
        created_at: post.created_at,
        id: post.id,
        slug: post.slug,
        path: post.path,
      });

      this.logger.log(`Post "${post.title}" enviado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao enviar post "${post.title}"`, error);
    }
  }
}
