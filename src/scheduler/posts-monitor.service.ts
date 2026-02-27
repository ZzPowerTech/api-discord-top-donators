import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { DiscordService } from '../discord/discord.service';
import { PostDto } from '../central-cart-api/dto/post.dto';
import { config } from '../config/config';

@Injectable()
export class PostsMonitorService implements OnModuleInit {
  private readonly logger = new Logger(PostsMonitorService.name);
  private lastCheckedPostId: number | null = null;

  constructor(
    private readonly centralCartApiService: CentralCartApiService,
    private readonly discordService: DiscordService,
  ) {}

  async onModuleInit() {
    // Inicializa com o ID do post mais recente para não enviar posts antigos
    try {
      const posts = await this.centralCartApiService.getPosts(
        config.centralCart.storeId,
      );
      if (posts && posts.length > 0) {
        // Ordena por ID decrescente para pegar o mais recente
        const sortedPosts = posts.sort((a, b) => b.id - a.id);
        this.lastCheckedPostId = sortedPosts[0].id;
        this.logger.log(
          `Inicializado com o post ID: ${this.lastCheckedPostId}`,
        );
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar monitor de posts', error);
    }
  }

  // Verifica novos posts a cada 5 minutos
  @Cron('*/5 * * * *', {
    timeZone: 'America/Sao_Paulo',
  })
  async checkNewPosts() {
    try {
      this.logger.log('Verificando novos posts...');

      const posts = await this.centralCartApiService.getPosts(
        config.centralCart.storeId,
      );

      if (!posts || posts.length === 0) {
        this.logger.log('Nenhum post encontrado');
        return;
      }

      // Ordena por ID decrescente
      const sortedPosts = posts.sort((a, b) => b.id - a.id);

      // Se é a primeira verificação, apenas salva o ID mais recente
      if (this.lastCheckedPostId === null) {
        this.lastCheckedPostId = sortedPosts[0].id;
        this.logger.log(`Primeiro check - Post ID: ${this.lastCheckedPostId}`);
        return;
      }

      // Procura por novos posts
      const newPosts = sortedPosts.filter(
        (post) => post.id > this.lastCheckedPostId!,
      );

      if (newPosts.length === 0) {
        this.logger.log('Nenhum post novo encontrado');
        return;
      }

      this.logger.log(`${newPosts.length} novo(s) post(s) encontrado(s)`);

      // Envia cada novo post para o Discord (do mais antigo para o mais novo)
      for (const post of newPosts.reverse()) {
        await this.sendPostToDiscord(post);
      }

      // Atualiza o último ID verificado
      this.lastCheckedPostId = sortedPosts[0].id;
    } catch (error) {
      this.logger.error('Erro ao verificar novos posts', error);
    }
  }

  private async sendPostToDiscord(post: PostDto) {
    try {
      this.logger.log(`Enviando post "${post.title}" para o Discord`);

      await this.discordService.sendPostUpdate({
        title: post.title,
        content: post.content,
        image: post.image,
        author: post.author,
        created_at: post.created_at,
      });

      this.logger.log(`Post "${post.title}" enviado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao enviar post "${post.title}"`, error);
    }
  }

  // Método manual para testar
  async sendLatestPost() {
    try {
      const posts = await this.centralCartApiService.getPosts(
        config.centralCart.storeId,
      );

      if (!posts || posts.length === 0) {
        this.logger.warn('Nenhum post encontrado');
        return;
      }

      const sortedPosts = posts.sort((a, b) => b.id - a.id);
      const latestPost = sortedPosts[0];

      await this.sendPostToDiscord(latestPost);
    } catch (error) {
      this.logger.error('Erro ao enviar último post', error);
      throw error;
    }
  }
}
