import { PostDto } from '../central-cart-api/dto/post.dto';

/** Campos do post relevantes para montar o link publico. */
export type PostLinkInput = Partial<
  Pick<PostDto, 'created_at' | 'slug' | 'path'>
>;

function formatDatePathSegment(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Monta o link publico do post. Funcao pura (sem efeito colateral), facil de
 * testar. Prioriza `path` (vem pronto da API); senao deriva de `slug` + data
 * (em UTC); sem `slug`, cai na URL base da loja.
 */
export function buildPostLink(post: PostLinkInput, storeUrl: string): string {
  if (post.path) {
    return `${storeUrl}${post.path}`;
  }

  if (post.slug) {
    const date = post.created_at ? new Date(post.created_at) : new Date();
    return `${storeUrl}/post/${formatDatePathSegment(date)}/${post.slug}`;
  }

  return storeUrl;
}
