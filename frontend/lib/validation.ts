/**
 * Validation Utilities for SkillsPulse Frontend
 * 
 * Common validation functions for form inputs and data
 */

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

// File validation
const ALLOWED_FILE_TYPES = ['text/csv', 'application/vnd.ms-excel'];
const MAX_FILE_SIZE_MB = 50;

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Validates password strength
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required'] };
  }
  
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    errors.push('Password must contain uppercase, lowercase, and number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates username format
 */
export function isValidUsername(username: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!username || typeof username !== 'string') {
    return { valid: false, errors: ['Username is required'] };
  }
  
  const trimmed = username.trim();
  
  if (trimmed.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (trimmed.length > 50) {
    errors.push('Username must be less than 50 characters');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates CSV file for upload
 */
export function isValidCSVFile(file: File): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!file) {
    return { valid: false, errors: ['File is required'] };
  }
  
  // Check file type
  const isCSV = file.name.endsWith('.csv') || ALLOWED_FILE_TYPES.includes(file.type);
  if (!isCSV) {
    errors.push('Only CSV files are allowed');
  }
  
  // Check file size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    errors.push(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
  }
  
  // Check for empty file
  if (file.size === 0) {
    errors.push('File cannot be empty');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates analysis query
 */
export function isValidQuery(query: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!query || typeof query !== 'string') {
    return { valid: false, errors: ['Query is required'] };
  }
  
  const trimmed = query.trim();
  
  if (trimmed.length < 5) {
    errors.push('Query must be at least 5 characters');
  }
  
  if (trimmed.length > 2000) {
    errors.push('Query must be less than 2000 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates column name format
 */
export function isValidColumnName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  // Column names should not start with numbers and contain only alphanumeric and underscores
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Sanitizes string for safe display
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  if (!date || typeof date !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

/**
 * Validates numeric value is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  if (typeof value !== 'number' || isNaN(value)) return false;
  return value >= min && value <= max;
}

/**
 * Validates array is not empty
 */
export function isNonEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0;
}
