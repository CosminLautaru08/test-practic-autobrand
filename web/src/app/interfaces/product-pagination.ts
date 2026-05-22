export interface ProductPagination {
  page?: number;
  limit?: number;
  name?: string;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}
