import { buildPostLink } from './post-link.builder';

const STORE = 'https://loja.austv.net';

describe('buildPostLink', () => {
  it('usa post.path quando presente', () => {
    expect(buildPostLink({ path: '/post/01/03/2025/novidade' }, STORE)).toBe(
      'https://loja.austv.net/post/01/03/2025/novidade',
    );
  });

  it('deriva de slug + created_at em UTC quando nao ha path', () => {
    expect(
      buildPostLink(
        { slug: 'novidade', created_at: '2025-03-01T10:00:00Z' },
        STORE,
      ),
    ).toBe('https://loja.austv.net/post/01/03/2025/novidade');
  });

  it('cai na URL base da loja quando nao ha path nem slug', () => {
    expect(buildPostLink({}, STORE)).toBe(STORE);
  });
});
