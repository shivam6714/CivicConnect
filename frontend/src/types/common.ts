export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOptions {
  status?: string;
  category?: string;
  wardId?: number;
  priority?: string;
  searchQuery?: string;
}
