/** Cliente como vem da API Central Cart (spent ainda em string BRL). */
export interface RawTopCustomer {
  username: string;
  spent: string; // Vem como "R$ 1.139,99"
  purchases: number;
  identifier: string;
}

export interface TopCustomersResponse {
  data: RawTopCustomer[];
  from: string;
  to: string;
}

/** Cliente enriquecido para uso interno: position e valor numerico sempre presentes. */
export interface TopCustomerView extends RawTopCustomer {
  position: number;
  totalNumeric: number;
}

/** @deprecated Use TopCustomerView. Mantido para compatibilidade ate o refactor da imagem. */
export type TopCustomerDto = TopCustomerView;
