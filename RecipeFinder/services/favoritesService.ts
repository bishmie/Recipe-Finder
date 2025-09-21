import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy,
  setDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Recipe } from './publishedRecipeService';

// Collections
const FAVORITES_COLLECTION = 'user_favorites';

// Types
export interface FavoriteRecipe {
  id?: string;
  userId: string;
  recipeId: string;
  recipeData: Recipe;
  addedAt: Date;
}

export const FavoritesService = {
  // Add a recipe to user's favorites
  addToFavorites: async (recipe: Recipe): Promise<void> => {
    try {
      console.log('Adding recipe to favorites:', recipe.id);
      
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to add favorites');
      }

      const userId = auth.currentUser.uid;
      console.log('User ID:', userId);
      
      // Check if already in favorites
      const isAlreadyFavorite = await FavoritesService.isRecipeFavorite(recipe.id);
      if (isAlreadyFavorite) {
        throw new Error('Recipe is already in favorites');
      }

      // Create a unique document ID using userId and recipeId
      const favoriteDocId = `${userId}_${recipe.id}`;
      const favoriteRef = doc(db, FAVORITES_COLLECTION, favoriteDocId);
      console.log('Favorite document ID:', favoriteDocId);

      // Clean recipe data to remove undefined values
      const cleanRecipeData = Object.fromEntries(
        Object.entries(recipe).filter(([_, value]) => value !== undefined)
      ) as Recipe;

      const favoriteData: Omit<FavoriteRecipe, 'id'> = {
        userId,
        recipeId: recipe.id,
        recipeData: cleanRecipeData,
        addedAt: new Date()
      };

      console.log('Saving favorite data to Firestore...');
      await setDoc(favoriteRef, {
        ...favoriteData,
        addedAt: Timestamp.now()
      });

      console.log('Recipe added to favorites successfully');
    } catch (error: any) {
      console.error('Error adding recipe to favorites:', error);
      throw error;
    }
  },

  // Remove a recipe from user's favorites
  removeFromFavorites: async (recipeId: string): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('User must be authenticated to remove favorites');
      }

      const userId = auth.currentUser.uid;
      const favoriteDocId = `${userId}_${recipeId}`;
      const favoriteRef = doc(db, FAVORITES_COLLECTION, favoriteDocId);

      await deleteDoc(favoriteRef);
      console.log('Recipe removed from favorites successfully');
    } catch (error: any) {
      console.error('Error removing recipe from favorites:', error);
      throw error;
    }
  },

  // Get all user's favorite recipes
  getUserFavorites: async (): Promise<FavoriteRecipe[]> => {
    try {
      if (!auth.currentUser) {
        return [];
      }

      const userId = auth.currentUser.uid;
      // Temporary fix: Remove orderBy to avoid index requirement
      // Sort in memory instead
      const q = query(
        collection(db, FAVORITES_COLLECTION),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      
      const favorites = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate() || new Date()
      })) as FavoriteRecipe[];

      // Sort by addedAt in descending order (newest first)
      return favorites.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
    } catch (error: any) {
      console.error('Error getting user favorites:', error);
      return [];
    }
  },

  // Check if a recipe is in user's favorites
  isRecipeFavorite: async (recipeId: string): Promise<boolean> => {
    try {
      if (!auth.currentUser) {
        return false;
      }

      const userId = auth.currentUser.uid;
      const favoriteDocId = `${userId}_${recipeId}`;
      const favoriteRef = doc(db, FAVORITES_COLLECTION, favoriteDocId);
      
      const favoriteDoc = await getDoc(favoriteRef);
      return favoriteDoc.exists();
    } catch (error: any) {
      console.error('Error checking if recipe is favorite:', error);
      return false;
    }
  },

  // Listen to user's favorites in real-time
  listenToUserFavorites: (callback: (favorites: FavoriteRecipe[]) => void): (() => void) => {
    if (!auth.currentUser) {
      console.log('No authenticated user for favorites listener');
      callback([]);
      return () => {};
    }

    const userId = auth.currentUser.uid;
    console.log('Setting up favorites listener for user:', userId);
    
    // Temporary fix: Remove orderBy to avoid index requirement
    // Sort in memory instead
    const q = query(
      collection(db, FAVORITES_COLLECTION),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      console.log('Favorites snapshot received, docs count:', querySnapshot.docs.length);
      const favorites = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Favorite doc data:', { id: doc.id, userId: data.userId, recipeId: data.recipeId });
        return {
          id: doc.id,
          ...data,
          addedAt: data.addedAt?.toDate() || new Date()
        };
      }) as FavoriteRecipe[];
      
      // Sort by addedAt in descending order (newest first)
      const sortedFavorites = favorites.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
      callback(sortedFavorites);
    }, (error) => {
      console.error('Error listening to user favorites:', error);
      callback([]);
    });

    return unsubscribe;
  },

  // Get user's favorites count
  getUserFavoritesCount: async (): Promise<number> => {
    try {
      const favorites = await FavoritesService.getUserFavorites();
      return favorites.length;
    } catch (error: any) {
      console.error('Error getting user favorites count:', error);
      return 0;
    }
  },

  // Toggle favorite status (add if not favorite, remove if favorite)
  toggleFavorite: async (recipe: Recipe): Promise<boolean> => {
    try {
      const isFavorite = await FavoritesService.isRecipeFavorite(recipe.id);
      
      if (isFavorite) {
        await FavoritesService.removeFromFavorites(recipe.id);
        return false;
      } else {
        await FavoritesService.addToFavorites(recipe);
        return true;
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  }
};