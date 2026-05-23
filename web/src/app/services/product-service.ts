import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';
import { Product, ProductWritePayload } from '../interfaces/product';
import { ProductList } from '../interfaces/product-list';
import { ProductPagination } from '../interfaces/product-pagination';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly baseUrl = `${API_BASE_URL}/product`;
  private readonly http = inject(HttpClient);

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

  create(product: ProductWritePayload): Observable<Product> {
    return this.http.post<Product>(this.baseUrl, product);
  }

  update(id: number, product: ProductWritePayload): Observable<Product> {
    return this.http.patch<Product>(`${this.baseUrl}/${id}`, product);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
