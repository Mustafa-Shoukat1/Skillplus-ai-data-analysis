/**
 * Application constants for SkillsPulse frontend
 */

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// File Upload
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ['.csv', '.xlsx', '.xls'];
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Authentication
export const TOKEN_KEY = 'skillspulse_token';
export const USER_KEY = 'currentUser';
export const TOKEN_EXPIRY_KEY = 'token_expiry';

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'skillspulse_token',
  USER: 'currentUser',
  USERS: 'systemUsers',
  FILE_ID: 'uploadedFileId',
  ANALYSES: 'savedAnalyses',
  THEME: 'theme'
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer'
} as const;

// Chart Types
export const CHART_TYPES = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
  { value: 'area', label: 'Area Chart' },
  { value: 'heatmap', label: 'Heatmap' }
] as const;

// Analysis Status
export const ANALYSIS_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Toast Messages
export const TOAST_MESSAGES = {
  UPLOAD_SUCCESS: 'File uploaded successfully!',
  UPLOAD_ERROR: 'Failed to upload file. Please try again.',
  ANALYSIS_SUCCESS: 'Analysis completed successfully!',
  ANALYSIS_ERROR: 'Analysis failed. Please try again.',
  LOGIN_SUCCESS: 'Welcome back!',
  LOGIN_ERROR: 'Invalid credentials. Please try again.',
  LOGOUT_SUCCESS: 'Logged out successfully.'
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  UPLOAD: '/upload',
  ANALYSIS: '/analysis',
  USERS: '/users',
  SETTINGS: '/settings'
} as const;
