export interface SupabaseResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface Proof {
  id: string;
  user_id: string;
  title: string;
  document_number: string;
  category: string;
  image_url: string;
  back_image_url: string | null;
  ai_summary: string | null;
  is_pinned: boolean;
  created_at: string;
  file_type?: string | null;
  file_size?: number | null;
}

export interface DbNotification {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  message?: string;
  is_read: boolean;
  created_at: string;
}

