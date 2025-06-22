export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}