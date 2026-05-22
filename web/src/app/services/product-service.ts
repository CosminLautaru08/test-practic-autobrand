import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import { Product } from '../interfaces/product';
import { ProductList } from '../interfaces/product-list';
import { ProductPagination } from '../interfaces/product-pagination';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly baseUrl = `${API_BASE_URL}/product`;

  constructor(private http: HttpClient) {}

  getAll(params: ProductPagination): Observable<ProductList> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<ProductList>(this.baseUrl, {
      params: httpParams,
    });
  }

  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrl}/${id}`);
  }

  create(product: Product): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  update(id: number, product: Partial<Product>): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/${id}`, product);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
