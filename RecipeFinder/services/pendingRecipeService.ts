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
  orderBy
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { NotificationService } from './notificationService';

// Collections
const PENDING_RECIPES_COLLECTION = 'recipes_pending';

// Types
export interface Ingredient {
  name: string;
  measure: string;
}

export interface PendingRecipe {
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
  status: 'pending' | 'pending_edit' | 'declined';
  createdAt: Date;
  updatedAt: Date;
  originalRecipeId?: string; // For pending edits
  declineReason?: string; // Reason for decline if applicable
}

export const PendingRecipeService = {
  // Add a new pending recipe
  addPendingRecipe: async (userId: string, recipeData: Omit<PendingRecipe, 'id' | 'ownerId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<PendingRecipe> => {
    if (!userId) {
      throw new Error('User must be authenticated to add recipes');
    }

    try {
      // Filter out undefined values to prevent Firestore errors
      const cleanedRecipeData = Object.fromEntries(
        Object.entries(recipeData).filter(([_, value]) => value !== undefined)
      );

      const pendingRecipe = {
        ...cleanedRecipeData,
        ownerId: userId,
        status: 'pending' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, PENDING_RECIPES_COLLECTION), pendingRecipe);
      
      // Send notification to admins about new recipe submission
      try {
        await NotificationService.sendNewRecipeNotificationToAdmins(recipeData.title, userId);
      } catch (notificationError) {
        console.warn('Failed to send new recipe notification to admins:', notificationError);
      }
      
      return {
        id: docRef.id,
        ...recipeData,
        ownerId: userId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error: any) {
      console.error('Error adding pending recipe:', error);
      throw error;
    }
  },

  // Get user's pending recipes
  getUserPendingRecipes: async (userId: string): Promise<PendingRecipe[]> => {
    try {
      const q = query(
        collection(db, PENDING_RECIPES_COLLECTION),
        where('ownerId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const recipes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PendingRecipe[];
      
      // Sort by createdAt in memory to avoid composite index requirement
      return recipes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error: any) {
      console.error('Error getting user pending recipes:', error);
      return [];
    }
  },

  // Update a pending recipe
  updatePendingRecipe: async (recipeId: string, updates: Partial<PendingRecipe>): Promise<void> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const recipeRef = doc(db, PENDING_RECIPES_COLLECTION, recipeId);
      
      // Check if recipe exists and user owns it
      const recipeDoc = await getDoc(recipeRef);
      if (!recipeDoc.exists()) {
        throw new Error('Recipe not found');
      }
      
      const recipeData = recipeDoc.data();
      if (recipeData.ownerId !== auth.currentUser.uid) {
        throw new Error('Unauthorized: You can only update your own recipes');
      }
      
      // Filter out undefined values to prevent Firestore errors
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );

      // If the recipe was declined and is being updated, change status back to pending
      // so it appears in the admin dashboard again for review
      const finalUpdates = {
        ...cleanedUpdates,
        updatedAt: Timestamp.now()
      };
      
      if (recipeData.status === 'declined') {
        finalUpdates.status = 'pending';
        // Clear the decline reason since it's resubmitted
        finalUpdates.declineReason = null;
      }

      await updateDoc(recipeRef, finalUpdates);
    } catch (error: any) {
      console.error('Error updating pending recipe:', error);
      throw error;
    }
  },

  // Delete a pending recipe
  deletePendingRecipe: async (recipeId: string): Promise<void> => {
    try {
      console.log('deletePendingRecipe called with ID:', recipeId);
      
      if (!auth.currentUser) {
        console.log('No authenticated user found');
        throw new Error('User must be logged in');
      }
      
      console.log('Current user ID:', auth.currentUser.uid);
      const recipeRef = doc(db, PENDING_RECIPES_COLLECTION, recipeId);
      console.log('Recipe reference created for collection:', PENDING_RECIPES_COLLECTION);
      
      // Check if recipe exists and user owns it
      console.log('Fetching recipe document...');
      const recipeDoc = await getDoc(recipeRef);
      if (!recipeDoc.exists()) {
        console.log('Recipe document does not exist');
        throw new Error('Recipe not found');
      }
      
      console.log('Recipe document found');
      const recipeData = recipeDoc.data();
      console.log('Recipe owner ID:', recipeData.ownerId);
      console.log('Current user ID:', auth.currentUser.uid);
      
      if (recipeData.ownerId !== auth.currentUser.uid) {
        console.log('Ownership check failed');
        throw new Error('Unauthorized: You can only delete your own recipes');
      }
      
      console.log('Ownership verified, proceeding with deletion...');
      await deleteDoc(recipeRef);
      console.log('Recipe document deleted successfully');
    } catch (error: any) {
      console.error('Error deleting pending recipe:', error);
      throw error;
    }
  },

  // Get a specific pending recipe by ID
  getPendingRecipeById: async (recipeId: string): Promise<PendingRecipe | null> => {
    try {
      const recipeRef = doc(db, PENDING_RECIPES_COLLECTION, recipeId);
      const recipeDoc = await getDoc(recipeRef);
      
      if (!recipeDoc.exists()) {
        return null;
      }
      
      const data = recipeDoc.data();
      return {
        id: recipeDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PendingRecipe;
    } catch (error: any) {
      console.error('Error getting pending recipe by ID:', error);
      return null;
    }
  },

  // Listen to user's pending recipes in real-time
  listenToUserPendingRecipes: (userId: string, callback: (recipes: PendingRecipe[]) => void): (() => void) => {
    const q = query(
      collection(db, PENDING_RECIPES_COLLECTION),
      where('ownerId', '==', userId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const recipes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PendingRecipe[];
      
      // Sort by createdAt in memory to avoid composite index requirement
      const sortedRecipes = recipes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      callback(sortedRecipes);
    }, (error) => {
      console.error('Error listening to user pending recipes:', error);
      callback([]);
    });
  },

  // Check if a pending edit already exists for a published recipe
  getExistingPendingEdit: async (originalRecipeId: string, userId: string): Promise<PendingRecipe | null> => {
    try {
      const q = query(
        collection(db, PENDING_RECIPES_COLLECTION),
        where('originalRecipeId', '==', originalRecipeId),
        where('ownerId', '==', userId),
        where('status', '==', 'pending_edit')
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }
      
      // Return the first (and should be only) pending edit
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as PendingRecipe;
    } catch (error: any) {
      console.error('Error checking for existing pending edit:', error);
      return null;
    }
  },

  // Create a pending edit for an existing published recipe
  createPendingEdit: async (originalRecipeId: string, updates: Partial<PendingRecipe>): Promise<PendingRecipe> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      // Check if a pending edit already exists
      const existingEdit = await PendingRecipeService.getExistingPendingEdit(originalRecipeId, auth.currentUser.uid);
      if (existingEdit) {
        throw new Error('A pending edit for this recipe already exists. Please edit the existing pending version instead.');
      }
      
      // Filter out undefined values to prevent Firestore errors
      const cleanedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      const pendingEdit = {
        ...cleanedUpdates,
        ownerId: auth.currentUser.uid,
        status: 'pending_edit' as const,
        originalRecipeId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, PENDING_RECIPES_COLLECTION), pendingEdit);
      
      return {
        id: docRef.id,
        ...updates,
        ownerId: auth.currentUser.uid,
        status: 'pending_edit',
        originalRecipeId,
        createdAt: new Date(),
        updatedAt: new Date()
      } as PendingRecipe;
    } catch (error: any) {
      console.error('Error creating pending edit:', error);
      throw error;
    }
  }
};