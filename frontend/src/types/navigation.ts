// Navigation and layout related types

// Tab navigation
export type TabType = 'domains' | 'pages';

export interface Tab {
  id: TabType;
  label: string;
  icon?: string;
}

// Navigation props
export interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  tabs: Tab[];
}

// Layout props
export interface LayoutProps {
  title?: string;
  showHeader?: boolean;
  showNavigation?: boolean;
}

// Header props
export interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: HeaderAction[];
}

// Header action
export interface HeaderAction {
  id: string;
  label: string;
  icon?: string;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

// Breadcrumb item
export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

// Breadcrumb props
export interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

// Main content props
export interface MainContentProps {
  activeTab: TabType;
  loading?: boolean;
}