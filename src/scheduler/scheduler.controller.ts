import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PostsMonitorService } from './posts-monitor.service';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly postsMonitorService: PostsMonitorService,
    private readonly centralCartApiService: CentralCartApiService,
  ) {}

  @Post('send-top-donators')
  async sendTopDonators() {
    await this.schedulerService.sendTopDonatorsNow();
    return { message: 'Top doadores enviados para o Discord!' };
  }

  @Post('send-top-donators-custom')
  async sendTopDonatorsCustom(
    @Body() body: { from: string; to: string; monthName?: string },
  ) {
    await this.schedulerService.sendTopDonatorsCustomDate(
      body.from,
      body.to,
      body.monthName,
    );
    return { message: `Top doadores de ${body.from} a ${body.to} enviados para o Discord!` };
  }

  @Post('send-latest-post')
  async sendLatestPost() {
    await this.postsMonitorService.sendLatestPost();
    return { message: 'Último post enviado para o Discord!' };
  }

  @Post('check-new-posts')
  async checkNewPosts() {
    await this.postsMonitorService.checkNewPosts();
    return { message: 'Verificação de novos posts executada!' };
  }

  @Get('test-posts-api')
  async testPostsApi(@Query('storeId') storeId?: string) {
    try {
      const posts = await this.centralCartApiService.getPosts(storeId);
      return {
        success: true,
        count: posts.length,
        posts: posts,
        message: posts.length > 0 
          ? `${posts.length} posts encontrados!` 
          : 'Nenhum endpoint de posts disponível. Verifique a documentação da API CentralCart ou configure um webhook.',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
