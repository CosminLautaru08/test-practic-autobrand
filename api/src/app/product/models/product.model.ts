import { BaseModel } from '../../abstract/base-model';

export interface ProductModel extends BaseModel {
  name: string;
  price: number;
  description: string;
}
