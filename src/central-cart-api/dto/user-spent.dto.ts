/** Resposta crua de GET /app/user_spent (valores já numéricos). */
export interface RawUserSpent {
  total_net_received: number;
  total_gross_received: number;
}

/** Forma interna normalizada. */
export interface UserSpent {
  totalNetReceived: number;
  totalGrossReceived: number;
}
