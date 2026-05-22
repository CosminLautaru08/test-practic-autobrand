export interface UpdateProduct {
  name: string;
  price: number;
  currency?: string;
  exchangeRate?: number;
  priceRon?: number;
  description: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
