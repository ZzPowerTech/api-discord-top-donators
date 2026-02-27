export interface TopCustomerDto {
  username: string;
  spent: string; // Vem como "R$ 1.139,99"
  purchases: number;
  identifier: string;
  position?: number;
  totalNumeric?: number; // Para cálculos internos
}

export interface TopCustomersResponse {
  data: TopCustomerDto[];
  from: string;
  to: string;
}
