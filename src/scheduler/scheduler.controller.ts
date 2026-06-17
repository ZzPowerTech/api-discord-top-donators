import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { PostsMonitorService } from './posts-monitor.service';
import { CentralCartApiService } from '../central-cart-api/central-cart-api.service';
import { getErrorMessage } from '../common/utils/get-error-message';
import { SendTopDonatorsCustomDto } from './dto/send-top-donators-custom.dto';

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
  async sendTopDonatorsCustom(@Body() dto: SendTopDonatorsCustomDto) {
    await this.schedulerService.sendTopDonatorsCustomDate(
      dto.from,
      dto.to,
      dto.monthName,
    );
    return {
      message: `Top doadores de ${dto.from} a ${dto.to} enviados para o Discord!`,
    };
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
        message:
          posts.length > 0
            ? `${posts.length} posts encontrados!`
            : 'Nenhum endpoint de posts disponível. Verifique a documentação da API CentralCart ou configure um webhook.',
      };
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      };
    }
  }
}
