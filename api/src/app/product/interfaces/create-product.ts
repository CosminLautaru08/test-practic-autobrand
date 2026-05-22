export interface CreateProduct {
  name: string;
  price: number;
  currency?: string;
  exchangeRate?: number;
  priceRon?: number;
  description: string;
  imageUrl: string;
}
