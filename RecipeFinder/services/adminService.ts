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
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { PendingRecipe } from './pendingRecipeService';
import { PublishedRecipe } from './publishedRecipeService';
import { NotificationService } from './notificationService';

// Collections
const PENDING_RECIPES_COLLECTION = 'recipes_pending';
const RECIPES_COLLECTION = 'recipes';
const ADMIN_ACTIONS_COLLECTION = 'admin_actions';

// Types
export interface AdminAction {
  id?: string;
  adminId: string;
  action: 'approve' | 'decline';
  recipeId: string;
  recipeName: string;
  reason?: string;
  timestamp: Date;
}

// Helper function to check if user is admin
const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    const adminEmails = [
      'bishmimalshi@gmail.com',
      'admin@recipefinder.com',
    ];
    
    if (auth.currentUser?.email) {
      return adminEmails.includes(auth.currentUser.email);
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

export const AdminService = {
  // Check if current user is admin
  isCurrentUserAdmin: async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    return await isAdmin(auth.currentUser.uid);
  },

  // Get all pending recipes for admin review
  getAllPendingRecipes: async (): Promise<PendingRecipe[]> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const q = query(
        collection(db, PENDING_RECIPES_COLLECTION),
        orderBy('createdAt', 'asc') // Oldest first FIFO
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PendingRecipe[];
    } catch (error: any) {
      console.error('Error getting all pending recipes:', error);
      throw error;
    }
  },

  // Approve a pending recipe (move to published recipes)
  approveRecipe: async (pendingId: string, adminId: string): Promise<void> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      // Get the pending recipe
      const pendingRef = doc(db, PENDING_RECIPES_COLLECTION, pendingId);
      const pendingDoc = await getDoc(pendingRef);
      
      if (!pendingDoc.exists()) {
        throw new Error('Pending recipe not found');
      }
      
      const pendingData = pendingDoc.data() as PendingRecipe;
      
      // Use batch write for atomic operation
      const batch = writeBatch(db);
      
      // If this is a pending edit, update the existing recipe
      if (pendingData.status === 'pending_edit' && pendingData.originalRecipeId) {
        const originalRef = doc(db, RECIPES_COLLECTION, pendingData.originalRecipeId);
        
        // Verify the original recipe exists before updating
        const originalDoc = await getDoc(originalRef);
        if (!originalDoc.exists()) {
          throw new Error(`Original recipe with ID ${pendingData.originalRecipeId} not found`);
        }
        
        // Filter out undefined values to prevent Firestore errors
        const updateData = Object.fromEntries(
          Object.entries({
            title: pendingData.title,
            description: pendingData.description,
            image: pendingData.image,
            cookTime: pendingData.cookTime,
            servings: pendingData.servings,
            category: pendingData.category,
            area: pendingData.area,
            ingredients: pendingData.ingredients,
            instructions: pendingData.instructions,
            videoUrl: pendingData.videoUrl,
            updatedAt: Timestamp.now()
          }).filter(([_, value]) => value !== undefined)
        );
        
        batch.update(originalRef, updateData);
        console.log(`Updated existing recipe ${pendingData.originalRecipeId} with pending edit changes`);
      } else {
        // Create new published recipe (for new submissions, not edits)
        // Filter out undefined values to prevent Firestore errors
        const publishedRecipe = Object.fromEntries(
          Object.entries({
            title: pendingData.title,
            description: pendingData.description,
            image: pendingData.image,
            cookTime: pendingData.cookTime,
            servings: pendingData.servings,
            category: pendingData.category,
            area: pendingData.area,
            ingredients: pendingData.ingredients,
            instructions: pendingData.instructions,
            videoUrl: pendingData.videoUrl,
            ownerId: pendingData.ownerId,
            createdAt: pendingData.createdAt,
            updatedAt: Timestamp.now(),
            publishedAt: Timestamp.now()
          }).filter(([_, value]) => value !== undefined)
        );
        
        const newRecipeRef = doc(collection(db, RECIPES_COLLECTION));
        batch.set(newRecipeRef, publishedRecipe);
      }
      
      // Delete the pending recipe
      batch.delete(pendingRef);
      
      // Log admin action
      const adminActionRef = doc(collection(db, ADMIN_ACTIONS_COLLECTION));
      batch.set(adminActionRef, {
        adminId,
        action: 'approve',
        recipeId: pendingId,
        recipeName: pendingData.title,
        timestamp: Timestamp.now()
      });
      
      // Commit the batch
      await batch.commit();
      
      // Send notification to recipe owner about approval
      try {
        await NotificationService.sendRecipeApprovedNotification(pendingData.ownerId, pendingData.title);
      } catch (notificationError) {
        console.warn('Failed to send approval notification:', notificationError);
      }
      
      console.log(`Recipe ${pendingId} approved by admin ${adminId}`);
    } catch (error: any) {
      console.error('Error approving recipe:', error);
      throw error;
    }
  },

  // Decline a pending recipe
  declineRecipe: async (pendingId: string, adminId: string, reason?: string): Promise<void> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      // Get the pending recipe
      const pendingRef = doc(db, PENDING_RECIPES_COLLECTION, pendingId);
      const pendingDoc = await getDoc(pendingRef);
      
      if (!pendingDoc.exists()) {
        throw new Error('Pending recipe not found');
      }
      
      const pendingData = pendingDoc.data() as PendingRecipe;
      
      // Use batch write for atomic operation
      const batch = writeBatch(db);
      
      // Update the pending recipe status to declined with reason
      batch.update(pendingRef, {
        status: 'declined',
        declineReason: reason || 'No reason provided',
        updatedAt: Timestamp.now()
      });
      
      // Log admin action
      const adminActionRef = doc(collection(db, ADMIN_ACTIONS_COLLECTION));
      batch.set(adminActionRef, {
        adminId,
        action: 'decline',
        recipeId: pendingId,
        recipeName: pendingData.title,
        reason: reason || 'No reason provided',
        timestamp: Timestamp.now()
      });
      
      // Commit the batch
      await batch.commit();
      
      // Send notification to recipe owner about decline with reason
      try {
        await NotificationService.sendRecipeDeclinedNotification(
          pendingData.ownerId, 
          pendingData.title, 
          reason || 'No reason provided'
        );
      } catch (notificationError) {
        console.warn('Failed to send decline notification:', notificationError);
      }
      
      console.log(`Recipe ${pendingId} declined by admin ${adminId}${reason ? ` - Reason: ${reason}` : ''}`);
    } catch (error: any) {
      console.error('Error declining recipe:', error);
      throw error;
    }
  },

  // Get all published recipes (admin view)
  getAllPublishedRecipes: async (): Promise<PublishedRecipe[]> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const q = query(
        collection(db, RECIPES_COLLECTION),
        orderBy('publishedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        publishedAt: doc.data().publishedAt?.toDate() || new Date()
      })) as PublishedRecipe[];
    } catch (error: any) {
      console.error('Error getting all published recipes:', error);
      throw error;
    }
  },

  // Delete a published recipe 
  deletePublishedRecipe: async (recipeId: string, adminId: string): Promise<void> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);
      const recipeDoc = await getDoc(recipeRef);
      
      if (!recipeDoc.exists()) {
        throw new Error('Recipe not found');
      }
      
      const recipeData = recipeDoc.data();
      
      // Use batch write for atomic operation
      const batch = writeBatch(db);
      
      // Delete the recipe
      batch.delete(recipeRef);
      
      // Log admin action
      const adminActionRef = doc(collection(db, ADMIN_ACTIONS_COLLECTION));
      batch.set(adminActionRef, {
        adminId,
        action: 'delete_published',
        recipeId,
        recipeName: recipeData.title,
        timestamp: Timestamp.now()
      });
      
      // Commit the batch
      await batch.commit();
      
      console.log(`Published recipe ${recipeId} deleted by admin ${adminId}`);
    } catch (error: any) {
      console.error('Error deleting published recipe:', error);
      throw error;
    }
  },

  // Listen to all pending recipes in real-time (admin)
  listenToAllPendingRecipes: (callback: (recipes: PendingRecipe[]) => void): (() => void) => {
    const q = query(
      collection(db, PENDING_RECIPES_COLLECTION),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const recipes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as PendingRecipe[];
      
      callback(recipes);
    }, (error) => {
      console.error('Error listening to all pending recipes:', error);
      callback([]);
    });
  },

  // Get admin actions history
  getAdminActions: async (limit: number = 50): Promise<AdminAction[]> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      const q = query(
        collection(db, ADMIN_ACTIONS_COLLECTION),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as AdminAction[];
    } catch (error: any) {
      console.error('Error getting admin actions:', error);
      return [];
    }
  },

  // Get statistics for admin dashboard
  getAdminStats: async (): Promise<{
    totalPending: number;
    totalPublished: number;
    totalDeclined: number;
    recentActions: number;
  }> => {
    try {
      if (!auth.currentUser) throw new Error('User must be logged in');
      
      const isUserAdmin = await isAdmin(auth.currentUser.uid);
      if (!isUserAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }
      
      // Get pending recipes count
      const pendingQuery = query(collection(db, PENDING_RECIPES_COLLECTION), where('status', '==', 'pending'));
      const pendingSnapshot = await getDocs(pendingQuery);
      
      // Get declined recipes count
      const declinedQuery = query(collection(db, PENDING_RECIPES_COLLECTION), where('status', '==', 'declined'));
      const declinedSnapshot = await getDocs(declinedQuery);
      
      // Get published recipes count
      const publishedSnapshot = await getDocs(collection(db, RECIPES_COLLECTION));
      
      // Get recent actions (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const recentActionsQuery = query(
        collection(db, ADMIN_ACTIONS_COLLECTION),
        where('timestamp', '>=', Timestamp.fromDate(yesterday))
      );
      const recentActionsSnapshot = await getDocs(recentActionsQuery);
      
      return {
        totalPending: pendingSnapshot.size,
        totalPublished: publishedSnapshot.size,
        totalDeclined: declinedSnapshot.size,
        recentActions: recentActionsSnapshot.size
      };
    } catch (error: any) {
      console.error('Error getting admin stats:', error);
      return {
        totalPending: 0,
        totalPublished: 0,
        totalDeclined: 0,
        recentActions: 0
      };
    }
  }
};