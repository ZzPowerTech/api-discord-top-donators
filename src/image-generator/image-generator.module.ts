import { Module } from '@nestjs/common';
import { ImageGeneratorService } from './image-generator.service';
import { MinecraftSkinService } from './services/minecraft-skin.service';
import { FontRegistrationService } from './services/font-registration.service';
import { CanvasRendererService } from './services/canvas-renderer.service';

@Module({
  providers: [
    ImageGeneratorService,
    MinecraftSkinService,
    FontRegistrationService,
    CanvasRendererService,
  ],
  exports: [ImageGeneratorService],
})
export class ImageGeneratorModule {}
