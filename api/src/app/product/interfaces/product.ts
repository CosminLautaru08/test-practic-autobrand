export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ProductList {
  data: Product[];
  page: number;
  total: number;
  lastPage: number;
}
