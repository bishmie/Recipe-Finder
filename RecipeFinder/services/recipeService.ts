// Recipe service that supports both MealDB API and Firebase
import * as MealAPI from './mealAPI';
import * as FirebaseRecipeService from './firebaseRecipeService';
import { auth } from './firebase';

// Types
export interface Ingredient {
  name: string;
  measure: string;
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  description: string;
  cookTime: string;
  servings: string;
  area?: string;
  category?: string;
  ingredients: Ingredient[];
  instructions: string[];
  videoUrl?: string; // YouTube video URL
  userId?: string; // Owner of the recipe
  createdAt?: Date; // Timestamp
  updatedAt?: Date; // Timestamp
  source?: 'firebase' | 'mealdb'; // Source of the recipe data
  status?: 'pending' | 'approved' | 'rejected'; // Recipe approval status
}

export interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
}

// Recipe Service functions
export const RecipeService = {
  // Get all recipes (combines demo recipes from MealDB and user recipes from Firebase)
  getRecipes: async (): Promise<Recipe[]> => {
    try {
      const [mealDbRecipes, firebaseRecipes] = await Promise.all([
        MealAPI.getRandomMeals(5),
        auth.currentUser ? FirebaseRecipeService.getAllRecipes() : Promise.resolve([])
      ]);

      // Mark the source of each recipe
      mealDbRecipes.forEach((recipe: Recipe) => {
        recipe.source = 'mealdb';
      });
      firebaseRecipes.forEach((recipe: Recipe) => {
        recipe.source = 'firebase';
      });

      return [...mealDbRecipes, ...firebaseRecipes];
    } catch (error) {
      console.error('Error getting recipes:', error);
      return [];
    }
  },

  // Get recipe by ID (checks both MealDB and Firebase)
  getRecipeById: async (id: string): Promise<Recipe | undefined> => {
    try {
      // Try Firebase first if user is logged in
      if (auth.currentUser) {
        const firebaseRecipe = await FirebaseRecipeService.getRecipeById(id);
        if (firebaseRecipe) {
          return { ...firebaseRecipe, source: 'firebase' };
        }
      }

      // Try MealDB if not found in Firebase
      const mealDbRecipe = await MealAPI.getMealById(id);
      return mealDbRecipe ? { ...mealDbRecipe, source: 'mealdb' } : undefined;
    } catch (error) {
      console.error('Error getting recipe by ID:', error);
      return undefined;
    }
  },

  // Get recipes by category (combines MealDB and Firebase results)
  getRecipesByCategory: async (category: string): Promise<Recipe[]> => {
    try {
      const [mealDbRecipes, firebaseRecipes] = await Promise.all([
        MealAPI.getMealsByCategory(category),
        auth.currentUser ? FirebaseRecipeService.getRecipesByCategory(category) : Promise.resolve([])
      ]);

      // Mark the source of each recipe
      mealDbRecipes.forEach((recipe: Recipe) => {
        recipe.source = 'mealdb';
      });
      firebaseRecipes.forEach((recipe: Recipe) => {
        recipe.source = 'firebase';
      });

      return [...mealDbRecipes, ...firebaseRecipes];
    } catch (error) {
      console.error('Error getting recipes by category:', error);
      return [];
    }
  },

  // ===== FIREBASE CATEGORY MANAGEMENT =====
  
  // Create a new category in Firebase
  createCategory: async (category: Omit<Category, 'id'>): Promise<Category> => {
    try {
      return await FirebaseRecipeService.createCategory(category);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  // Get category by ID from Firebase
  getCategoryById: async (id: string): Promise<Category | null> => {
    try {
      return await FirebaseRecipeService.getCategoryById(id);
    } catch (error) {
      console.error('Error getting category by ID:', error);
      throw error;
    }
  },

  // Update a category in Firebase
  updateCategory: async (id: string, categoryData: Partial<Category>): Promise<void> => {
    try {
      await FirebaseRecipeService.updateCategory(id, categoryData);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Delete a category from Firebase
  deleteCategory: async (id: string): Promise<void> => {
    try {
      await FirebaseRecipeService.deleteCategory(id);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Get random recipes (primarily from MealDB for demo content)
  getRandomRecipes: async (count: number = 5): Promise<Recipe[]> => {
    try {
      const recipes = await MealAPI.getRandomMeals(count);
      recipes.forEach((recipe: Recipe) => {
        recipe.source = 'mealdb';
      });
      return recipes;
    } catch (error) {
      console.error('Error getting random recipes:', error);
      return [];
    }
  },

  // Get a random recipe for featured section (from MealDB)
  getRandomRecipe: async (): Promise<Recipe | undefined> => {
    try {
      const recipes = await MealAPI.getRandomMeals(1);
      if (recipes.length > 0) {
        const recipe: Recipe = recipes[0];
        recipe.source = 'mealdb';
        return recipe;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting random recipe:', error);
      return undefined;
    }
  },

  // Get all categories (combines MealDB and Firebase categories)
  getCategories: async (): Promise<Category[]> => {
    try {
      const [mealDbCategories, firebaseCategories] = await Promise.all([
        MealAPI.getMealCategories(),
        FirebaseRecipeService.getAllCategories()
      ]);

      return [...mealDbCategories, ...firebaseCategories];
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  },

  // Search recipes (combines results from both sources)
  searchRecipes: async (query: string): Promise<Recipe[]> => {
    try {
      const [mealDbRecipes, firebaseRecipes] = await Promise.all([
        MealAPI.searchMealsByName(query),
        auth.currentUser ? FirebaseRecipeService.searchRecipes(query) : Promise.resolve([])
      ]);

      // Mark the source of each recipe
      mealDbRecipes.forEach((recipe: Recipe) => {
        recipe.source = 'mealdb';
      });
      firebaseRecipes.forEach((recipe: Recipe) => {
        recipe.source = 'firebase';
      });

      return [...mealDbRecipes, ...firebaseRecipes];
    } catch (error) {
      console.error('Error searching recipes:', error);
      return [];
    }
  },

  // CRUD operations (Firebase only)
  addRecipe: async (recipe: Omit<Recipe, 'id'>): Promise<Recipe | undefined> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in to add recipes');
      return await FirebaseRecipeService.createRecipe(recipe);
    } catch (error) {
      console.error('Error adding recipe:', error);
      return undefined;
    }
  },

  updateRecipe: async (id: string, recipeData: Partial<Recipe>): Promise<boolean> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in to update recipes');
      await FirebaseRecipeService.updateRecipe(id, recipeData);
      return true;
    } catch (error) {
      console.error('Error updating recipe:', error);
      return false;
    }
  },

  deleteRecipe: async (id: string): Promise<boolean> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in to delete recipes');
      await FirebaseRecipeService.deleteRecipe(id);
      return true;
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return false;
    }
  },

  // === ADMIN FUNCTIONS FOR PENDING RECIPE MANAGEMENT ===
  
  // Get all pending recipes (admin only)
  getPendingRecipes: async (): Promise<Recipe[]> => {
    try {
      return await FirebaseRecipeService.getPendingRecipes();
    } catch (error) {
      console.error('Error getting pending recipes:', error);
      return [];
    }
  },

  // Approve a pending recipe (admin only)
  approveRecipe: async (id: string): Promise<boolean> => {
    try {
      await FirebaseRecipeService.approveRecipe(id);
      return true;
    } catch (error) {
      console.error('Error approving recipe:', error);
      return false;
    }
  },

  // Reject a pending recipe (admin only)
  rejectRecipe: async (id: string): Promise<boolean> => {
    try {
      await FirebaseRecipeService.rejectRecipe(id);
      return true;
    } catch (error) {
      console.error('Error rejecting recipe:', error);
      return false;
    }
  },

  // Get all recipes with any status (admin only)
  getAllRecipesAdmin: async (): Promise<Recipe[]> => {
    try {
      return await FirebaseRecipeService.getAllRecipesAdmin();
    } catch (error) {
      console.error('Error getting all recipes (admin):', error);
      return [];
    }
  },

  // Get all user's recipes regardless of status (for user's own view)
  getUserRecipesAll: async (userId: string): Promise<Recipe[]> => {
    try {
      return await FirebaseRecipeService.getUserRecipesAll(userId);
    } catch (error) {
      console.error('Error getting all user recipes:', error);
      return [];
    }
  }
};