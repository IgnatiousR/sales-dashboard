export interface Sale {
  _id: string;
  date: string;
  price: number;
  customerEmail: string;
  customerPhone: string;
  __v: number;
}

export interface TotalSale {
  day: string;
  totalSale: number;
}

export interface Filters {
  startDate: string;
  endDate: string;
  priceMin: string;
  email: string;
  phone: string;
  sortBy: string;
  sortOrder: string;
  after?: string;
  before?: string;
}

export type SalesQueryParams = Partial<Filters>;
