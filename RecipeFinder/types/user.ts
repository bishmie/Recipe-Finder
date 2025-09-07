export interface UserStats {
  recipesCount: number;
  approvedRecipesCount: number;
  pendingRecipesCount: number;
  favoritesCount: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  stats: UserStats;
}

export interface AdminStats {
  totalUsers: number;
  totalRecipes: number;
  pendingRecipes: number;
  publishedRecipes: number;
  newUsersThisMonth: number;
  newRecipesThisMonth: number;
}

export interface NotificationData {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'recipe_approved' | 'recipe_declined' | 'recipe_submitted' | 'system' | 'welcome';
  read: boolean;
  createdAt: Date;
  data?: {
    recipeId?: string;
    actionUrl?: string;
  };
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

// Admin credentials for role assignment
export const ADMIN_CREDENTIALS = {
  email: 'bishmimalshi@gmail.com',
  password: 'bishmi'
};

// User role types
export type UserRole = 'user' | 'admin';

// Recipe status types
export type RecipeStatus = 'pending' | 'approved' | 'declined';

// Notification types
export type NotificationType = 'recipe_approved' | 'recipe_declined' | 'recipe_submitted' | 'system' | 'welcome';

// Recipe approval actions
export interface RecipeApprovalAction {
  type: 'approve' | 'decline';
  recipeId: string;
  reason?: string;
  adminId: string;
}



// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface FormErrors {
  [key: string]: string;
}