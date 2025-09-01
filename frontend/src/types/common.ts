// Common types and interfaces

// API Response format
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    details?: any;
  };
}

// Error types
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CLOUDFLARE_API_ERROR = 'CLOUDFLARE_API_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR'
}

// User-friendly error interface
export interface UserFriendlyError {
  title: string;
  message: string;
  action: 'retry' | 'dismiss' | 'redirect';
}

// Loading state
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Component props for common UI elements
export interface BaseComponentProps {
  class?: string;
  disabled?: boolean;
}

// Modal props
export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
}

// Button props
export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

// Input props
export interface InputProps extends BaseComponentProps {
  modelValue?: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'url';
  required?: boolean;
  error?: string;
}

// Form validation
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => boolean | string;
}

export interface FormField {
  value: string;
  error?: string;
  rules?: ValidationRule[];
}