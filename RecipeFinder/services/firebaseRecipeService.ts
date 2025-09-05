import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from './firebase';
import type { Recipe, Category } from './recipeService';

const RECIPES_COLLECTION = 'recipes';
const CATEGORIES_COLLECTION = 'categories';

// Create a new recipe (sets status to 'pending' by default)
export const createRecipe = async (recipe: Omit<Recipe, 'id'>, imageFile?: File): Promise<Recipe> => {
  try {
    // Add recipe to Firestore with pending status
    const docRef = await addDoc(collection(db, RECIPES_COLLECTION), {
      ...recipe,
      status: 'pending', // New recipes start as pending
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Return the created recipe with its ID
    return {
      id: docRef.id,
      ...recipe,
      status: 'pending'
    };
  } catch (error) {
    console.error('Error creating recipe:', error);
    throw error;
  }
};

// Get all approved recipes (for regular users)
export const getAllRecipes = async (): Promise<Recipe[]> => {
  try {
    const q = query(collection(db, RECIPES_COLLECTION), where('status', '==', 'approved'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error getting all recipes:', error);
    throw error;
  }
};

// Get recipe by ID
export const getRecipeById = async (id: string): Promise<Recipe | null> => {
  try {
    const docRef = doc(db, RECIPES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Recipe;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting recipe by ID:', error);
    throw error;
  }
};

// Get recipes by user ID
// Get user's approved recipes only (for public display)
export const getUserRecipes = async (userId: string): Promise<Recipe[]> => {
  try {
    const q = query(
      collection(db, RECIPES_COLLECTION), 
      where('userId', '==', userId),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error getting user recipes:', error);
    throw error;
  }
};

// Get all user's recipes regardless of status (for user's own view)
export const getUserRecipesAll = async (userId: string): Promise<Recipe[]> => {
  try {
    const q = query(collection(db, RECIPES_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error getting all user recipes:', error);
    throw error;
  }
};

// Get recipes by category
export const getRecipesByCategory = async (category: string): Promise<Recipe[]> => {
  try {
    const q = query(collection(db, RECIPES_COLLECTION), where('category', '==', category));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error getting recipes by category:', error);
    throw error;
  }
};

// Update a recipe
export const updateRecipe = async (id: string, recipeData: Partial<Recipe>): Promise<void> => {
  try {
    // Get current recipe data to check for status changes
    const recipeRef = doc(db, RECIPES_COLLECTION, id);
    const currentRecipeDoc = await getDoc(recipeRef);
    
    if (!currentRecipeDoc.exists()) {
      throw new Error('Recipe not found');
    }
    
    const currentRecipe = currentRecipeDoc.data() as Recipe;
    
    // Update the recipe
    await updateDoc(recipeRef, {
      ...recipeData,
      updatedAt: new Date()
    });
    
    // Handle status change notifications and stats updates
    if (recipeData.status && recipeData.status !== currentRecipe.status && currentRecipe.userId) {
      const { UserService } = await import('./userService');
      
      // If recipe was edited and status changed to pending (user edited approved recipe)
      if (recipeData.status === 'pending' && currentRecipe.status === 'approved') {
        // Create notification for user about resubmission
        await UserService.createNotification({
          userId: currentRecipe.userId,
          title: 'Recipe Resubmitted',
          message: `Your edited recipe "${currentRecipe.title}" has been resubmitted for review.`,
          type: 'recipe_submitted',
          read: false,
          data: {
            recipeId: id,
            actionUrl: `/recipe/${id}`
          }
        });
      }
    }
  } catch (error) {
    console.error('Error updating recipe:', error);
    throw error;
  }
};

// Delete a recipe
export const deleteRecipe = async (id: string): Promise<void> => {
  try {
    // Get recipe details first to access userId and title for notifications
    const recipeRef = doc(db, RECIPES_COLLECTION, id);
    const recipeDoc = await getDoc(recipeRef);
    
    if (!recipeDoc.exists()) {
      throw new Error('Recipe not found');
    }
    
    const recipeData = recipeDoc.data() as Recipe;
    
    // Delete the recipe
    await deleteDoc(recipeRef);
    
    // Update user stats and create notification if recipe has userId
    if (recipeData.userId) {
      const { UserService } = await import('./userService');
      
      // Update user stats
      await UserService.updateUserRecipeStats(recipeData.userId, 'delete');
      
      // Create notification for user (only if deleted by admin, not by user themselves)
      // We can check if current user is admin by checking auth context
      const { auth } = await import('./firebase');
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.uid !== recipeData.userId) {
        // Recipe was deleted by admin, notify the user
        await UserService.createNotification({
          userId: recipeData.userId,
          title: 'Recipe Removed',
          message: `Your recipe "${recipeData.title}" has been removed by an administrator.`,
          type: 'system',
          read: false
        });
      }
    }
  } catch (error) {
    console.error('Error deleting recipe:', error);
    throw error;
  }
};

// Search recipes
export const searchRecipes = async (query: string): Promise<Recipe[]> => {
  try {
    // Get all recipes (in a real app, you'd want to implement proper search indexing)
    const recipes = await getAllRecipes();
    
    // Filter recipes based on title or description
    const lowercaseQuery = query.toLowerCase();
    return recipes.filter(recipe => 
      recipe.title.toLowerCase().includes(lowercaseQuery) ||
      recipe.description.toLowerCase().includes(lowercaseQuery)
    );
  } catch (error) {
    console.error('Error searching recipes:', error);
    throw error;
  }
};

// ===== CATEGORY MANAGEMENT =====

// Create a new category
export const createCategory = async (category: Omit<Category, 'id'>): Promise<Category> => {
  try {
    const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
      ...category,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return {
      id: docRef.id,
      ...category
    };
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
};

// Get all categories
export const getAllCategories = async (): Promise<Category[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORIES_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Category[];
  } catch (error) {
    console.error('Error getting all categories:', error);
    throw error;
  }
};

// Get category by ID
export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Category;
    }
    return null;
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
};

// Update a category
export const updateCategory = async (id: string, categoryData: Partial<Category>): Promise<void> => {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, id);
    await updateDoc(docRef, {
      ...categoryData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

// Delete a category
export const deleteCategory = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// === PENDING RECIPE MANAGEMENT (Admin Functions) ===

// Get all pending recipes (for admin review)
export const getPendingRecipes = async (): Promise<Recipe[]> => {
  try {
    const q = query(collection(db, RECIPES_COLLECTION), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error getting pending recipes:', error);
    throw error;
  }
};

// Approve a pending recipe (admin function)
export const approveRecipe = async (id: string): Promise<void> => {
  try {
    // Get recipe details first to access userId and title
    const recipeRef = doc(db, RECIPES_COLLECTION, id);
    const recipeDoc = await getDoc(recipeRef);
    
    if (!recipeDoc.exists()) {
      throw new Error('Recipe not found');
    }
    
    const recipeData = recipeDoc.data() as Recipe;
    
    // Update recipe status
    await updateDoc(recipeRef, {
      status: 'approved',
      updatedAt: new Date()
    });
    
    // Update user stats and create notification if recipe has userId
    if (recipeData.userId) {
      const { UserService } = await import('./userService');
      
      // Update user stats
      await UserService.updateUserRecipeStats(recipeData.userId, 'approve');
      
      // Create notification for user
      await UserService.createNotification({
        userId: recipeData.userId,
        title: 'Recipe Approved!',
        message: `Your recipe "${recipeData.title}" has been approved and is now published.`,
        type: 'recipe_approved',
        read: false,
        data: {
          recipeId: id,
          actionUrl: `/recipe/${id}`
        }
      });
    }
  } catch (error) {
    console.error('Error approving recipe:', error);
    throw error;
  }
};

// Reject a pending recipe (admin function)
export const rejectRecipe = async (id: string): Promise<void> => {
  try {
    // Get recipe details first to access userId and title
    const recipeRef = doc(db, RECIPES_COLLECTION, id);
    const recipeDoc = await getDoc(recipeRef);
    
    if (!recipeDoc.exists()) {
      throw new Error('Recipe not found');
    }
    
    const recipeData = recipeDoc.data() as Recipe;
    
    // Update recipe status
    await updateDoc(recipeRef, {
      status: 'rejected',
      updatedAt: new Date()
    });
    
    // Update user stats and create notification if recipe has userId
    if (recipeData.userId) {
      const { UserService } = await import('./userService');
      
      // Update user stats
      await UserService.updateUserRecipeStats(recipeData.userId, 'decline');
      
      // Create notification for user
      await UserService.createNotification({
        userId: recipeData.userId,
        title: 'Recipe Not Approved',
        message: `Your recipe "${recipeData.title}" was not approved. You can edit and resubmit it for review.`,
        type: 'recipe_declined',
        read: false,
        data: {
          recipeId: id,
          actionUrl: `/recipe/edit/${id}`
        }
      });
    }
  } catch (error) {
    console.error('Error rejecting recipe:', error);
    throw error;
  }
};

// Get all recipes with any status (admin function)
export const getAllRecipesAdmin = async (): Promise<Recipe[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, RECIPES_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    console.error('Error getting all recipes (admin):', error);
    throw error;
  }
};
