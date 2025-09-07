// Unified Recipe service that handles all recipe operations with admin approval workflow
// This service now uses Firebase Firestore instead of AsyncStorage for pending recipes

import { PendingRecipeService, PendingRecipe, Ingredient } from './pendingRecipeService';
import { PublishedRecipeService, PublishedRecipe, Recipe, Category } from './publishedRecipeService';
import { AdminService, AdminAction } from './adminService';
import { auth } from './firebase';

// Re-export types for backward compatibility
export type { Ingredient, Recipe, PendingRecipe, PublishedRecipe, Category, AdminAction };

// Legacy interface for backward compatibility
export interface UserRecipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cookTime: string;
  servings: string;
  category: string;
  area?: string;
  ingredients: Ingredient[];
  instructions: string[];
  videoUrl?: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  recipeType: 'pending' | 'published';
  status: 'pending' | 'pending_edit' | 'published' | 'declined';
  originalRecipeId?: string;
}

// Main RecipeService that combines all services
export const RecipeService = {
  // Published Recipe Operations
  getRecipes: PublishedRecipeService.getRecipes,
  getAllPublishedRecipes: PublishedRecipeService.getAllPublishedRecipes,
  getUserPublishedRecipes: PublishedRecipeService.getUserPublishedRecipes,
  getRecipeById: async (id: string): Promise<Recipe | undefined> => {
    try {
      // First try to get from pending recipes
      const pendingRecipe = await PendingRecipeService.getPendingRecipeById(id);
      if (pendingRecipe) {
        // Convert PendingRecipe to Recipe format
        return {
          id: pendingRecipe.id || '',
          title: pendingRecipe.title,
          image: pendingRecipe.image,
          description: pendingRecipe.description,
          cookTime: pendingRecipe.cookTime,
          servings: pendingRecipe.servings,
          area: pendingRecipe.area,
          category: pendingRecipe.category,
          ingredients: pendingRecipe.ingredients,
          instructions: pendingRecipe.instructions,
          videoUrl: pendingRecipe.videoUrl,
          youtubeUrl: pendingRecipe.videoUrl,
          userId: pendingRecipe.ownerId,
          createdAt: pendingRecipe.createdAt.toISOString(),
          updatedAt: pendingRecipe.updatedAt.toISOString(),
          source: 'firebase',
          status: pendingRecipe.status as any
        };
      }
      
      // If not found in pending, try published recipes and MealDB
      return await PublishedRecipeService.getRecipeById(id);
    } catch (error: any) {
      console.error('Error getting recipe by ID:', error);
      return undefined;
    }
  },
  getRecipesByCategory: PublishedRecipeService.getRecipesByCategory,
  getRandomRecipes: PublishedRecipeService.getRandomRecipes,
  getRandomRecipe: PublishedRecipeService.getRandomRecipe,
  getCategories: PublishedRecipeService.getCategories,
  searchRecipes: PublishedRecipeService.searchRecipes,
  updateRecipe: PublishedRecipeService.updatePublishedRecipe,
  deleteRecipe: PublishedRecipeService.deletePublishedRecipe,
  listenToUserPublishedRecipes: PublishedRecipeService.listenToUserPublishedRecipes,

  // Pending Recipe Operations
  addPendingRecipe: PendingRecipeService.addPendingRecipe,
  getUserPendingRecipes: PendingRecipeService.getUserPendingRecipes,
  updatePendingRecipe: PendingRecipeService.updatePendingRecipe,
  deletePendingRecipe: PendingRecipeService.deletePendingRecipe,
  getPendingRecipeById: PendingRecipeService.getPendingRecipeById,
  createPendingEdit: PendingRecipeService.createPendingEdit,
  listenToUserPendingRecipes: PendingRecipeService.listenToUserPendingRecipes,

  // Admin Operations
  getAllPendingRecipes: AdminService.getAllPendingRecipes,
  approveRecipe: AdminService.approveRecipe,
  declineRecipe: AdminService.declineRecipe,
  deletePublishedRecipe: AdminService.deletePublishedRecipe,
  listenToAllPendingRecipes: AdminService.listenToAllPendingRecipes,
  getAdminActions: AdminService.getAdminActions,
  getAdminStats: AdminService.getAdminStats,
  isCurrentUserAdmin: AdminService.isCurrentUserAdmin,

  // Legacy methods for backward compatibility
  addRecipe: async (recipe: Omit<Recipe, 'id'>): Promise<Recipe | undefined> => {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to add recipes');
      }

      // Convert Recipe to PendingRecipe format
      const pendingRecipeData = {
        title: recipe.title,
        description: recipe.description || '',
        image: recipe.image,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        category: recipe.category || 'Other',
        area: recipe.area,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        videoUrl: recipe.videoUrl
      };

      const pendingRecipe = await PendingRecipeService.addPendingRecipe(
        auth.currentUser.uid,
        pendingRecipeData
      );

      // Convert back to Recipe format for return
      return {
        id: pendingRecipe.id || '',
        title: pendingRecipe.title,
        image: pendingRecipe.image,
        description: pendingRecipe.description,
        cookTime: pendingRecipe.cookTime,
        servings: pendingRecipe.servings,
        area: pendingRecipe.area,
        category: pendingRecipe.category,
        ingredients: pendingRecipe.ingredients,
        instructions: pendingRecipe.instructions,
        videoUrl: pendingRecipe.videoUrl,
        userId: pendingRecipe.ownerId,
        createdAt: pendingRecipe.createdAt,
        updatedAt: pendingRecipe.updatedAt,
        source: 'firebase',
        status: 'pending'
      };
    } catch (error: any) {
      console.error('Error adding recipe:', error);
      return undefined;
    }
  },

  // Legacy method - now returns pending recipes as Recipe format
  getPendingRecipes: async (): Promise<Recipe[]> => {
    try {
      const pendingRecipes = await AdminService.getAllPendingRecipes();
      return pendingRecipes.map(pending => ({
        id: pending.id || '',
        title: pending.title,
        image: pending.image,
        description: pending.description,
        cookTime: pending.cookTime,
        servings: pending.servings,
        area: pending.area,
        category: pending.category,
        ingredients: pending.ingredients,
        instructions: pending.instructions,
        videoUrl: pending.videoUrl,
        userId: pending.ownerId,
        createdAt: pending.createdAt,
        updatedAt: pending.updatedAt,
        source: 'firebase',
        status: 'pending'
      }));
    } catch (error: any) {
      console.error('Error getting pending recipes:', error);
      return [];
    }
  },

  // Legacy admin methods with simplified signatures
  publishPending: async (pendingId: string, adminId: string): Promise<void> => {
    return AdminService.approveRecipe(pendingId, adminId);
  },

  declinePending: async (pendingId: string, adminId: string, reason?: string): Promise<void> => {
    return AdminService.declineRecipe(pendingId, adminId, reason);
  },

  // Legacy method for getting all recipes (admin view)
  getAllRecipesAdmin: async (): Promise<Recipe[]> => {
    try {
      const publishedRecipes = await AdminService.getAllPublishedRecipes();
      return publishedRecipes.map(published => ({
        id: published.id || '',
        title: published.title,
        image: published.image,
        description: published.description,
        cookTime: published.cookTime,
        servings: published.servings,
        area: published.area,
        category: published.category,
        ingredients: published.ingredients,
        instructions: published.instructions,
        videoUrl: published.videoUrl,
        userId: published.ownerId,
        createdAt: published.createdAt,
        updatedAt: published.updatedAt,
        source: 'firebase',
        status: 'approved'
      }));
    } catch (error: any) {
      console.error('Error getting all recipes for admin:', error);
      return [];
    }
  },

  // Legacy method for getting user's all recipes (both pending and published)
  getUserRecipesAll: async (userId: string): Promise<Recipe[]> => {
    try {
      const [pendingRecipes, publishedRecipes] = await Promise.all([
        PendingRecipeService.getUserPendingRecipes(userId),
        PublishedRecipeService.getUserPublishedRecipes(userId)
      ]);

      const pendingAsRecipes: Recipe[] = pendingRecipes.map(pending => ({
        id: pending.id || '',
        title: pending.title,
        image: pending.image,
        description: pending.description,
        cookTime: pending.cookTime,
        servings: pending.servings,
        area: pending.area,
        category: pending.category,
        ingredients: pending.ingredients,
        instructions: pending.instructions,
        videoUrl: pending.videoUrl,
        userId: pending.ownerId,
        createdAt: pending.createdAt,
        updatedAt: pending.updatedAt,
        source: 'firebase',
        status: pending.status === 'declined' ? 'rejected' : 'pending'
      }));

      const publishedAsRecipes: Recipe[] = publishedRecipes.map(published => ({
        id: published.id || '',
        title: published.title,
        image: published.image,
        description: published.description,
        cookTime: published.cookTime,
        servings: published.servings,
        area: published.area,
        category: published.category,
        ingredients: published.ingredients,
        instructions: published.instructions,
        videoUrl: published.videoUrl,
        userId: published.ownerId,
        createdAt: published.createdAt,
        updatedAt: published.updatedAt,
        source: 'firebase',
        status: 'approved'
      }));

      return [...pendingAsRecipes, ...publishedAsRecipes];
    } catch (error: any) {
      console.error('Error getting user recipes:', error);
      return [];
    }
  },

  // Legacy methods with simplified implementations
  rejectRecipe: async (id: string): Promise<boolean> => {
    try {
      if (!auth.currentUser) return false;
      await AdminService.declineRecipe(id, auth.currentUser.uid, 'Rejected by admin');
      return true;
    } catch (error: any) {
      console.error('Error rejecting recipe:', error);
      return false;
    }
  }
};

// Export individual services for direct access if needed
export { PendingRecipeService, PublishedRecipeService, AdminService };
