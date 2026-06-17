import { PostDto } from '../central-cart-api/dto/post.dto';

/**
 * Dados necessarios para notificar um post no Discord. Derivado de PostDto:
 * apenas `title` e obrigatorio; os demais campos sao opcionais.
 */
export type DiscordPostPayload = Pick<PostDto, 'title'> &
  Partial<
    Pick<
      PostDto,
      'content' | 'image' | 'author' | 'created_at' | 'id' | 'slug' | 'path'
    >
  >;
