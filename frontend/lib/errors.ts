/**
 * Error handling utilities for SkillsPulse Frontend
 */

// Error types
export type ErrorType =
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR';

// Error response structure
export interface ErrorResponse {
  type: ErrorType;
  message: string;
  details?: Record<string, unknown>;
  statusCode?: number;
  timestamp: string;
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  type: ErrorType;
  statusCode?: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    type: ErrorType = 'UNKNOWN_ERROR',
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse(): ErrorResponse {
    return {
      type: this.type,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Parse error from various sources into AppError
 */
export function parseError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new AppError('Network connection error', 'NETWORK_ERROR');
    }

    return new AppError(error.message, 'UNKNOWN_ERROR');
  }

  // API response error
  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;

    if ('status' in errObj && typeof errObj.status === 'number') {
      const status = errObj.status;
      const message = (errObj.message as string) || 'An error occurred';

      if (status === 401) {
        return new AppError(message, 'AUTH_ERROR', status);
      }
      if (status === 403) {
        return new AppError('Access forbidden', 'AUTH_ERROR', status);
      }
      if (status === 404) {
        return new AppError('Resource not found', 'NOT_FOUND', status);
      }
      if (status === 429) {
        return new AppError('Too many requests', 'RATE_LIMITED', status);
      }
      if (status >= 500) {
        return new AppError('Server error', 'SERVER_ERROR', status);
      }
      if (status >= 400) {
        return new AppError(message, 'VALIDATION_ERROR', status);
      }
    }

    if ('message' in errObj) {
      return new AppError(errObj.message as string, 'UNKNOWN_ERROR');
    }
  }

  // String error
  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR');
  }

  return new AppError('An unexpected error occurred', 'UNKNOWN_ERROR');
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return 'Unable to connect to the server. Please check your internet connection.';
    case 'AUTH_ERROR':
      return 'Authentication failed. Please log in again.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'RATE_LIMITED':
      return 'Too many requests. Please wait a moment and try again.';
    case 'SERVER_ERROR':
      return 'Server error. Please try again later.';
    case 'VALIDATION_ERROR':
      return error.message || 'Invalid input. Please check your data.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

/**
 * Error boundary fallback props
 */
export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

/**
 * Log error for debugging/monitoring
 */
export function logError(error: AppError, context?: string): void {
  const logData = {
    ...error.toResponse(),
    context,
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    url: typeof window !== 'undefined' ? window.location.href : 'server',
  };

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Send to error tracking service (e.g., Sentry)
    console.error('[Error]', logData);
  } else {
    console.error('[Dev Error]', logData);
  }
}

/**
 * Handle async errors with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = true } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      const appError = parseError(error);
      if (['AUTH_ERROR', 'VALIDATION_ERROR', 'NOT_FOUND'].includes(appError.type)) {
        throw appError;
      }

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        const delay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw parseError(lastError);
}
