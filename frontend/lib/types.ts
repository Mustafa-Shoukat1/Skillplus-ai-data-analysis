/**
 * Type definitions for SkillsPulse frontend
 */

// User types
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'admin' | 'viewer';
  createdDate: string;
}

export interface UserCreate {
  username: string;
  password: string;
  name: string;
  email?: string;
  role: 'admin' | 'viewer';
}

// Authentication types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// File types
export interface UploadedFile {
  file_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  columns: string[];
  row_count: number;
  upload_timestamp: string;
}

export interface FilePreview {
  columns: string[];
  data: Record<string, any>[];
  total_rows: number;
  preview_rows: number;
}

// Analysis types
export interface Analysis {
  id: string;
  analysis_id: string;
  title: string;
  query: string;
  query_type: 'visualization' | 'analysis' | 'summary';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: AnalysisResult;
  visualization_html?: string;
  is_visible: boolean;
  created_at: string;
  processing_time?: number;
  model_used?: string;
}

export interface AnalysisResult {
  summary?: string;
  insights?: string[];
  data?: Record<string, any>;
  chart_config?: ChartConfig;
}

export interface ChartConfig {
  type: string;
  title: string;
  data: any;
  options?: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Component prop types
export interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export interface FileUploadProps {
  onUploadComplete: (file: UploadedFile) => void;
  maxSize?: number;
  acceptedTypes?: string[];
}

export interface ChartDisplayProps {
  html: string;
  title?: string;
  onDownload?: () => void;
}
