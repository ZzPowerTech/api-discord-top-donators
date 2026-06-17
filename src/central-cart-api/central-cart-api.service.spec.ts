import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import { CentralCartApiService } from './central-cart-api.service';

/**
 * Testes de caracterizacao: travam o comportamento ATUAL antes do refactor.
 * Servem de rede de seguranca para as mudancas dos proximos PRs.
 */
describe('CentralCartApiService (caracterizacao)', () => {
  let service: CentralCartApiService;
  let httpGet: jest.Mock;

  beforeEach(() => {
    httpGet = jest.fn();
    const httpService = { get: httpGet } as unknown as HttpService;
    service = new CentralCartApiService(httpService);
  });

  describe('getTopCustomers', () => {
    it('adiciona position (1-based) e converte spent BRL em totalNumeric', async () => {
      httpGet.mockReturnValue(
        of({
          data: {
            data: [
              {
                username: 'Alpha',
                spent: 'R$ 1.139,99',
                purchases: 3,
                identifier: 'a',
              },
              {
                username: 'Bravo',
                spent: 'R$ 0,00',
                purchases: 0,
                identifier: 'b',
              },
              {
                username: 'Charlie',
                spent: 'R$ 1.000',
                purchases: 1,
                identifier: 'c',
              },
            ],
          },
        }),
      );

      const result = await service.getTopCustomers('2025-01-01', '2025-01-31');

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        username: 'Alpha',
        position: 1,
        totalNumeric: 1139.99,
      });
      expect(result[1]).toMatchObject({ position: 2, totalNumeric: 0 });
      expect(result[2]).toMatchObject({ position: 3, totalNumeric: 1000 });
    });

    it('retorna lista vazia quando a resposta nao traz data.data', async () => {
      httpGet.mockReturnValue(of({ data: {} }));
      await expect(service.getTopCustomers('a', 'b')).resolves.toEqual([]);
    });

    it('relança o erro em falha HTTP (nao engole)', async () => {
      httpGet.mockReturnValue(throwError(() => new Error('HTTP 500')));
      await expect(service.getTopCustomers('a', 'b')).rejects.toThrow(
        'HTTP 500',
      );
    });
  });

  describe('getPosts', () => {
    it('aceita array direto na resposta', async () => {
      httpGet.mockReturnValue(of({ data: [{ id: 1 }, { id: 2 }] }));
      await expect(service.getPosts('loja.austv.net')).resolves.toHaveLength(2);
    });

    it('aceita envelope { data: [] }', async () => {
      httpGet.mockReturnValue(of({ data: { data: [{ id: 5 }] } }));
      await expect(service.getPosts('loja.austv.net')).resolves.toEqual([
        { id: 5 },
      ]);
    });

    it('retorna [] e nao lança quando a chamada falha', async () => {
      httpGet.mockReturnValue(throwError(() => new Error('offline')));
      await expect(service.getPosts('loja.austv.net')).resolves.toEqual([]);
    });
  });
});
