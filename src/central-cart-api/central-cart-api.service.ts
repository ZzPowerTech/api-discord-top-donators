import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { config } from '../config/config';
import { TopCustomersResponse, TopCustomerDto } from './dto/top-customer.dto';
import { PostDto } from './dto/post.dto';

@Injectable()
export class CentralCartApiService {
  private readonly logger = new Logger(CentralCartApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async getTopCustomers(from: string, to: string): Promise<TopCustomerDto[]> {
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

      const customers = response.data.data || [];

      // Add position and convert spent to numeric for sorting/display
      const customersWithPosition = customers.map((customer, index) => {
        // Converter "R$ 1.139,99" para número
        const spentNumeric = this.convertBRLToNumber(customer.spent);

        return {
          ...customer,
          position: index + 1,
          totalNumeric: spentNumeric,
        };
      });

      this.logger.log(`${customers.length} clientes encontrados`);
      return customersWithPosition;
    } catch (error) {
      this.logger.error('Erro ao buscar top customers', error);
      throw error;
    }
  }

  private convertBRLToNumber(value: string): number {
    // Remove "R$" e espaços, substitui . por nada e , por .
    // "R$ 1.139,99" -> "1139.99"
    return parseFloat(
      value
        .replace('R$', '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.'),
    );
  }

  async getTopCustomersFromPreviousMonth(): Promise<TopCustomerDto[]> {
    const now = new Date();
    const firstDayOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
    const lastDayOfPreviousMonth = new Date(
      firstDayOfCurrentMonth.getTime() - 1,
    );
    const firstDayOfPreviousMonth = new Date(
      lastDayOfPreviousMonth.getFullYear(),
      lastDayOfPreviousMonth.getMonth(),
      1,
    );

    const from = firstDayOfPreviousMonth.toISOString().split('T')[0];
    const to = lastDayOfPreviousMonth.toISOString().split('T')[0];

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

      // A API pode retornar direto ou em { data: [] }
      const posts = Array.isArray(response.data)
        ? response.data
        : (response.data as any).data || [];

      this.logger.log(`${posts.length} posts encontrados`);
      return posts;
    } catch (error) {
      this.logger.error('Erro ao buscar posts', error?.message || error);
      return [];
    }
  }
}
