import { Sale, TotalSale } from "./sales.types";

export interface AuthResponse {
  token: string;
  expire: number;
}

export interface SalesResponse {
  results: {
    TotalSales: TotalSale[];
    Sales: Sale[];
  };
  pagination: {
    before: string;
    after: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
}
