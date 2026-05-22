import { Product } from './product';

export interface ProductList {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  lastPage: number;
}
