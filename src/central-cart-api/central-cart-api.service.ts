import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { config } from '../config/config';
import { TopCustomersResponse, TopCustomerView } from './dto/top-customer.dto';
import { PostDto } from './dto/post.dto';
import { getErrorMessage } from '../common/utils/get-error-message';
import { parseBRL } from '../common/utils/parse-brl';
import { getPreviousMonthRange } from '../common/utils/month-range';

@Injectable()
export class CentralCartApiService {
  private readonly logger = new Logger(CentralCartApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async getTopCustomers(from: string, to: string): Promise<TopCustomerView[]> {
    try {
      const url = `${config.centralCart.apiUrl}/app/widget/top_customers`;
      this.logger.log(`Buscando top customers: ${from} a ${to}`);

      const response = await firstValueFrom(
        this.httpService.get<TopCustomersResponse>(url, {
          params: { from, to },
          headers: {
            Authorization: `Bearer ${config.centralCart.bearerToken}`,
          },
        }),
      );

      const customers = response.data.data ?? [];

      // Enriquece com posição (1-based) e valor numérico para ordenação/exibição.
      const customersWithPosition: TopCustomerView[] = customers.map(
        (customer, index) => ({
          ...customer,
          position: index + 1,
          totalNumeric: parseBRL(customer.spent),
        }),
      );

      this.logger.log(`${customers.length} clientes encontrados`);
      return customersWithPosition;
    } catch (error) {
      this.logger.error('Erro ao buscar top customers', error);
      throw error;
    }
  }

  async getTopCustomersFromPreviousMonth(): Promise<TopCustomerView[]> {
    const { from, to } = getPreviousMonthRange(new Date());
    return this.getTopCustomers(from, to);
  }

  async getPosts(storeId?: string): Promise<PostDto[]> {
    try {
      const storeDomain = storeId || config.centralCart.storeId;

      if (!storeDomain) {
        this.logger.error('Store domain não configurado');
        return [];
      }

      const url = `${config.centralCart.apiUrl}/webstore/post`;
      this.logger.log(`Buscando posts da webstore: ${storeDomain}`);

      const response = await firstValueFrom(
        this.httpService.get<PostDto[] | { data: PostDto[] }>(url, {
          headers: {
            Authorization: `Bearer ${config.centralCart.bearerToken}`,
            'x-store-domain': storeDomain,
          },
        }),
      );

      // A API pode retornar direto (array) ou no envelope { data: [] }.
      const data = response.data;
      const posts = Array.isArray(data) ? data : (data.data ?? []);

      this.logger.log(`${posts.length} posts encontrados`);
      return posts;
    } catch (error) {
      this.logger.error('Erro ao buscar posts', getErrorMessage(error));
      return [];
    }
  }
}
