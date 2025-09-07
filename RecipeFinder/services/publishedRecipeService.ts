import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import * as MealAPI from './mealAPI';

// Collections
const RECIPES_COLLECTION = 'recipes';

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
  videoUrl?: string;
  userId?: string; // Owner of the recipe
  createdAt?: Date;
  updatedAt?: Date;
  source?: 'firebase' | 'mealdb';
  status?: 'approved';
}

export interface PublishedRecipe {
  id?: string;
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
  publishedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  image: string;
  description: string;
}

export const PublishedRecipeService = {
  // Get all published recipes (combines Firebase and MealDB)
  getRecipes: async (): Promise<Recipe[]> => {
    try {
      // Get Firebase recipes
      const firebaseRecipes = await PublishedRecipeService.getAllPublishedRecipes();
      const convertedFirebaseRecipes: Recipe[] = firebaseRecipes.map(recipe => ({
        id: recipe.id || '',
        title: recipe.title,
        image: recipe.image,
        description: recipe.description,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        area: recipe.area,
        category: recipe.category,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        videoUrl: recipe.videoUrl,
        userId: recipe.ownerId,
        createdAt: recipe.createdAt,
        updatedAt: recipe.updatedAt,
        source: 'firebase'
      }));

      // Get MealDB recipes
      const mealDBRecipes = await MealAPI.getRandomRecipes(10);
      
      return [...convertedFirebaseRecipes, ...mealDBRecipes];
    } catch (error: any) {
      console.error('Error getting recipes:', error);
      return [];
    }
  },

  // Get all published recipes from Firebase
  getAllPublishedRecipes: async (): Promise<PublishedRecipe[]> => {
    try {
      const q = query(
        collection(db, RECIPES_COLLECTION),
        orderBy('publishedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.docs.length === 0) {
        return [];
      }
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          publishedAt: data.publishedAt?.toDate() || new Date()
        } as PublishedRecipe;
      });
    } catch (error: any) {
      console.error('Error getting all published recipes:', error);
      return [];
    }
  },

  // Get user's published recipes
  getUserPublishedRecipes: async (userId: string): Promise<PublishedRecipe[]> => {
    try {
      const q = query(
        collection(db, RECIPES_COLLECTION),
        where('ownerId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const recipes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        publishedAt: doc.data().publishedAt?.toDate() || new Date()
      })) as PublishedRecipe[];
      
      // Sort by publishedAt in memory to avoid composite index requirement
      return recipes.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    } catch (error: any) {
      console.error('Error getting user published recipes:', error);
      return [];
    }
  },

  // Get recipe by ID (checks both Firebase and MealDB)
  getRecipeById: async (id: string): Promise<Recipe | undefined> => {
    try {
      // First try Firebase
      const recipeRef = doc(db, RECIPES_COLLECTION, id);
      const recipeDoc = await getDoc(recipeRef);
      
      if (recipeDoc.exists()) {
        const data = recipeDoc.data();
        return {
          id: recipeDoc.id,
          title: data.title,
          image: data.image,
          description: data.description,
          cookTime: data.cookTime,
          servings: data.servings,
          area: data.area,
          category: data.category,
          ingredients: data.ingredients,
          instructions: data.instructions,
          videoUrl: data.videoUrl,
          userId: data.ownerId,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          source: 'firebase'
        };
      }
      
      // If not found in Firebase, try MealDB
      return await MealAPI.getRecipeById(id);
    } catch (error: any) {
      console.error('Error getting recipe by ID:', error);
      return undefined;
    }
  },

  // Get recipes by category
  getRecipesByCategory: async (category: string): Promise<Recipe[]> => {
    console.log('PublishedRecipeService.getRecipesByCategory called with category:', category);
    try {
      // Get Firebase recipes (temporarily removed orderBy to avoid index requirement)
      const q = query(
        collection(db, RECIPES_COLLECTION),
        where('category', '==', category)
        // orderBy('publishedAt', 'desc') // Commented out until composite index is created
      );
      const querySnapshot = await getDocs(q);
      
      const firebaseRecipes: Recipe[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          image: data.image,
          description: data.description,
          cookTime: data.cookTime,
          servings: data.servings,
          area: data.area,
          category: data.category,
          ingredients: data.ingredients,
          instructions: data.instructions,
          videoUrl: data.videoUrl,
          userId: data.ownerId,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          source: 'firebase'
        };
      });
      
      console.log('Firebase recipes found:', firebaseRecipes.length);
      
      // Get MealDB recipes
      console.log('Calling MealAPI.getRecipesByCategory...');
      const mealDBRecipes = await MealAPI.getRecipesByCategory(category);
      console.log('MealDB recipes received:', mealDBRecipes?.length || 0);
      
      const totalRecipes = [...firebaseRecipes, ...mealDBRecipes];
      console.log('Total recipes returned:', totalRecipes.length);
      return totalRecipes;
    } catch (error: any) {
      console.error('Error getting recipes by category:', error);
      return [];
    }
  },

  // Get random recipes
  getRandomRecipes: async (count: number = 5): Promise<Recipe[]> => {
    try {
      // For simplicity, get from MealDB API
      return await MealAPI.getRandomRecipes(count);
    } catch (error: any) {
      console.error('Error getting random recipes:', error);
      return [];
    }
  },

  // Get random recipe
  getRandomRecipe: async (): Promise<Recipe | undefined> => {
    try {
      return await MealAPI.getRandomRecipe();
    } catch (error: any) {
      console.error('Error getting random recipe:', error);
      return undefined;
    }
  },

  // Get categories
  getCategories: async (): Promise<Category[]> => {
    try {
      return await MealAPI.getCategories();
    } catch (error: any) {
      console.error('Error getting categories:', error);
      return [];
    }
  },

  // Search recipes
  searchRecipes: async (query: string): Promise<Recipe[]> => {
    try {
      // For now, use MealDB search
      // In the future, you could implement Firestore text search
      return await MealAPI.searchRecipes(query);
    } catch (error: any) {
      console.error('Error searching recipes:', error);
      return [];
    }
  },

  // Update a published recipe
  updatePublishedRecipe: async (id: string, recipeData: Partial<PublishedRecipe>): Promise<boolean> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const recipeRef = doc(db, RECIPES_COLLECTION, id);
      
      // Check if recipe exists and user owns it
      const recipeDoc = await getDoc(recipeRef);
      if (!recipeDoc.exists()) {
        throw new Error('Recipe not found');
      }
      
      const recipeDocData = recipeDoc.data();
      if (recipeDocData.ownerId !== auth.currentUser.uid) {
        throw new Error('Unauthorized: You can only update your own recipes');
      }
      
      // Filter out undefined values to prevent Firestore errors
      const cleanedRecipeData = Object.fromEntries(
        Object.entries(recipeData).filter(([_, value]) => value !== undefined)
      );

      await updateDoc(recipeRef, {
        ...cleanedRecipeData,
        updatedAt: Timestamp.now()
      });
      
      return true;
    } catch (error: any) {
      console.error('Error updating published recipe:', error);
      return false;
    }
  },

  // Delete a published recipe
  deletePublishedRecipe: async (id: string): Promise<boolean> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const recipeRef = doc(db, RECIPES_COLLECTION, id);
      
      // Check if recipe exists and user owns it
      const recipeDoc = await getDoc(recipeRef);
      if (!recipeDoc.exists()) {
        throw new Error('Recipe not found');
      }
      
      const recipeData = recipeDoc.data();
      if (recipeData.ownerId !== auth.currentUser.uid) {
        throw new Error('Unauthorized: You can only delete your own recipes');
      }
      
      await deleteDoc(recipeRef);
      return true;
    } catch (error: any) {
      console.error('Error deleting published recipe:', error);
      return false;
    }
  },

  // Listen to user's published recipes in real-time
  listenToUserPublishedRecipes: (userId: string, callback: (recipes: PublishedRecipe[]) => void): (() => void) => {
    const q = query(
      collection(db, RECIPES_COLLECTION),
      where('ownerId', '==', userId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const recipes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        publishedAt: doc.data().publishedAt?.toDate() || new Date()
      })) as PublishedRecipe[];
      
      // Sort by publishedAt in memory to avoid composite index requirement
      const sortedRecipes = recipes.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
      callback(sortedRecipes);
    }, (error) => {
      console.error('Error listening to user published recipes:', error);
      callback([]);
    });
  }
};