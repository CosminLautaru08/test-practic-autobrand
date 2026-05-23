export interface ProductWritePayload {
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  currency?: string;
  exchangeRate?: number;
  priceRon?: number;
}

export type Product = Omit<
  ProductWritePayload,
  'currency' | 'exchangeRate' | 'priceRon'
> & {
  id: number;
  currency: string;
  exchangeRate: number;
  priceRon: number;
  createdAt: string;
  updatedAt: string;
};
