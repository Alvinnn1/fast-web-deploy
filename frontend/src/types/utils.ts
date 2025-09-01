// Utility types and helper interfaces

// Generic utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;

// Callback types
export type Callback<T = void> = () => T;
export type AsyncCallback<T = void> = () => Promise<T>;
export type CallbackWithParam<P, T = void> = (param: P) => T;
export type AsyncCallbackWithParam<P, T = void> = (param: P) => Promise<T>;

// State management types
export interface StateManager<T> {
  state: T;
  setState: (newState: Partial<T>) => void;
  resetState: () => void;
}

// Async operation state
export interface AsyncOperationState<T = any, E = Error> {
  data?: T;
  loading: boolean;
  error?: E;
}

// Form state management
export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Pagination state
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Sort state
export interface SortState<T = string> {
  field: T;
  direction: 'asc' | 'desc';
}

// Filter state
export interface FilterState<T = Record<string, any>> {
  filters: T;
  activeFilters: (keyof T)[];
}

// Search state
export interface SearchState {
  query: string;
  results: any[];
  loading: boolean;
  hasMore: boolean;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'purple' | 'blue' | 'green' | 'red' | 'gray';

// Responsive breakpoints
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Component size variants
export type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Component color variants
export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

// Animation types
export type AnimationType = 'fade' | 'slide' | 'scale' | 'bounce' | 'none';
export type AnimationDirection = 'up' | 'down' | 'left' | 'right';

// Position types
export type Position = 'top' | 'bottom' | 'left' | 'right' | 'center';
export type Alignment = 'start' | 'center' | 'end' | 'stretch';

// Spacing types
export type Spacing = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12 | 16 | 20 | 24 | 32;

// Component ref types
export type ComponentRef<T = HTMLElement> = T | null;

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Feature flag types
export interface FeatureFlags {
  [key: string]: boolean;
}

// Configuration types
export interface AppConfig {
  apiUrl: string;
  environment: Environment;
  version: string;
  features: FeatureFlags;
  theme: {
    mode: ThemeMode;
    colorScheme: ColorScheme;
  };
}

// File validation types
export interface FileValidation {
  maxSize: number; // in bytes
  allowedTypes: string[];
  allowedExtensions: string[];
}

// Upload progress types
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number; // bytes per second
  timeRemaining?: number; // seconds
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffMultiplier?: number;
  maxDelay?: number;
}

// Cache configuration
export interface CacheConfig {
  ttl: number; // time to live in milliseconds
  maxSize?: number;
  strategy?: 'lru' | 'fifo' | 'lfu';
}