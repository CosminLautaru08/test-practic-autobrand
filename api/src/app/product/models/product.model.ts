import { BaseModel } from '../../abstract/base-model';

export interface ProductModel extends BaseModel {
  name: string;
  price: number;
  currency: string;
  exchangeRate: number;
  priceRon: number;
  description: string;
  imageUrl: string;
}
