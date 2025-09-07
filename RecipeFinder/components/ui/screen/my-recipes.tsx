import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../constants/colors';
import { useAuth } from '../../../hooks/useAuth';
import RecipeCard from '../../../components/RecipeCard';
import LoadingSpinner from '../../../components/LoadingSpinner';
import SafeScreen from '../../../components/SafeScreen';
import { AddRecipeModal } from '../../../components/ui/AddRecipeModal';
import {
  PendingRecipe,
  PublishedRecipe,
  RecipeService
} from '../../../services/recipeService';
import { myRecipesStyles as styles } from '../../../assets/styles/my-recipes.styles';

// Combined recipe type for display
type UserRecipe = (PendingRecipe | PublishedRecipe) & {
  recipeType: 'pending' | 'published';
};

const MyRecipesScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<UserRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<UserRecipe | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<UserRecipe | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [recipeToEdit, setRecipeToEdit] = useState<UserRecipe | null>(null);

  const loadUserRecipes = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Get pending recipes
      const pendingRecipes = await RecipeService.getUserPendingRecipes(user.uid);
      const pendingWithType: UserRecipe[] = pendingRecipes.map(recipe => ({
        ...recipe,
        recipeType: 'pending' as const
      }));
      
      // Get published recipes
      const publishedRecipes = await RecipeService.getUserPublishedRecipes(user.uid);
      const publishedWithType: UserRecipe[] = publishedRecipes.map(recipe => ({
        ...recipe,
        recipeType: 'published' as const
      }));
      
      // Combine and sort recipes by creation date
      const allRecipes = [...pendingWithType, ...publishedWithType];
      allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRecipes(allRecipes);
    } catch (error) {
      console.error('Error loading user recipes:', error);
      Alert.alert('Error', 'Failed to load your recipes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserRecipes();
    setRefreshing(false);
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    console.log('handleDeleteRecipe called with ID:', recipeId);
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      console.log('Recipe not found in recipes array');
      Alert.alert('Error', 'Recipe not found');
      return;
    }

    console.log('Found recipe:', recipe.title, 'Type:', recipe.recipeType);
    setRecipeToDelete(recipe);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!recipeToDelete) return;
    
    console.log('Delete confirmed, starting deletion process...');
    setShowDeleteConfirm(false);
    
    try {
      let success = false;
      if (recipeToDelete.recipeType === 'pending') {
        console.log('Calling RecipeService.deletePendingRecipe...');
        await RecipeService.deletePendingRecipe(recipeToDelete.id);
        success = true;
        console.log('deletePendingRecipe completed successfully');
      } else {
        console.log('Calling RecipeService.deleteRecipe...');
        success = await RecipeService.deleteRecipe(recipeToDelete.id);
        console.log('deleteRecipe result:', success);
      }
      
      if (success) {
        console.log('Deletion successful, showing success alert');
        Alert.alert('Success', 'Recipe deleted successfully!');
        // Refresh the list
        await loadUserRecipes();
      } else {
        console.log('Deletion failed, showing error alert');
        Alert.alert('Error', 'Failed to delete recipe');
      }
    } catch (error: any) {
      console.error('Error deleting recipe:', error);
      Alert.alert('Error', error?.message || 'Failed to delete recipe');
    } finally {
      setRecipeToDelete(null);
    }
  };

  const cancelDelete = () => {
    console.log('Delete cancelled');
    setShowDeleteConfirm(false);
    setRecipeToDelete(null);
  };

  const handleEditRecipe = async (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }
    
    if (recipe.recipeType === 'pending') {
      // For pending recipes, allow direct editing
      setEditingRecipe(recipe);
      setShowAddModal(true);
      Alert.alert(
        'Editing Recipe',
        'You are now editing a pending recipe. Changes will be saved for admin review.'
      );
    } else {
      // For published recipes, show confirmation modal
      setRecipeToEdit(recipe);
      setShowEditConfirm(true);
    }
  };

  const confirmEditRecipe = async () => {
    if (!recipeToEdit || !user?.uid) return;
    
    setShowEditConfirm(false);
    
    try {
      // check if a pending edit already exists
      const existingEdit = await RecipeService.getExistingPendingEdit(recipeToEdit.id, user.uid);
      
      if (existingEdit) {
        // if pending edit exists, open it for editing
        const existingEditAsUserRecipe: UserRecipe = {
          ...existingEdit,
          recipeType: 'pending' as const
        };
        setEditingRecipe(existingEditAsUserRecipe);
        setShowAddModal(true);
        Alert.alert(
          'Editing Existing Draft',
          'You already have a pending edit for this recipe. Opening your existing draft for editing.'
        );
      } else {
        // Create new pending edit
        await RecipeService.createPendingEdit(recipeToEdit.id, {
          title: recipeToEdit.title,
          description: recipeToEdit.description,
          image: recipeToEdit.image,
          cookTime: recipeToEdit.cookTime,
          servings: recipeToEdit.servings,
          category: recipeToEdit.category,
          area: recipeToEdit.area,
          ingredients: recipeToEdit.ingredients,
          instructions: recipeToEdit.instructions,
          videoUrl: recipeToEdit.videoUrl
        });
        
        Alert.alert(
          'Edit Draft Created',
          'Your recipe edit draft has been created. You can now edit it and submit for admin approval.',
          [
            { text: 'OK', onPress: () => loadUserRecipes() }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error handling recipe edit:', error);
      Alert.alert('Error', `Failed to edit recipe: ${error?.message || 'Unknown error'}`);
    } finally {
      setRecipeToEdit(null);
    }
  };

  const cancelEditRecipe = () => {
    setShowEditConfirm(false);
    setRecipeToEdit(null);
  };

  const handleRecipeAdded = async (recipeData: any) => {
    // AddRecipeModal already handles saving the recipe to the database
    // This function just needs to update the UI state and refresh the list
    console.log('Recipe added/updated:', recipeData.title);
    
    // Close modal and reset editing state
    setShowAddModal(false);
    setEditingRecipe(null);
    
    // Refresh the recipes list to show the new/updated recipe
    await loadUserRecipes();
  };

  const handleRecipeUpdated = (updatedRecipe: Recipe) => {
    setRecipes(prev => prev.map(recipe => 
      recipe.id === updatedRecipe.id ? updatedRecipe : recipe
    ));
    setShowAddModal(false);
    setEditingRecipe(null);
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setEditingRecipe(null);
  };

  useEffect(() => {
    if (!user?.uid) return;

    // Set up real-time listeners
    const unsubscribePending = RecipeService.listenToUserPendingRecipes(user.uid, (pendingRecipes) => {
      const pendingWithType: UserRecipe[] = pendingRecipes.map(recipe => ({
        ...recipe,
        recipeType: 'pending' as const
      }));
      
      // Update recipes state with new pending recipes
      setRecipes(prevRecipes => {
        const publishedRecipes = prevRecipes.filter(r => r.recipeType === 'published');
        const allRecipes = [...pendingWithType, ...publishedRecipes];
        allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return allRecipes;
      });
    });

    const unsubscribePublished = RecipeService.listenToUserPublishedRecipes(user.uid, (publishedRecipes) => {
      const publishedWithType: UserRecipe[] = publishedRecipes.map(recipe => ({
        ...recipe,
        recipeType: 'published' as const
      }));
      
      // Update recipes state with new published recipes
      setRecipes(prevRecipes => {
        const pendingRecipes = prevRecipes.filter(r => r.recipeType === 'pending');
        const allRecipes = [...pendingRecipes, ...publishedWithType];
        allRecipes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return allRecipes;
      });
    });

    // Initial load
    loadUserRecipes();
    setLoading(false);

    // Cleanup listeners
    return () => {
      unsubscribePending();
      unsubscribePublished();
    };
  }, [user?.uid]);



  const renderRecipeItem = ({ item }: { item: UserRecipe }) => {
    const getStatusColor = (recipeType: 'pending' | 'published', status?: string) => {
      if (recipeType === 'published') {
        return '#34C759';
      }
      
      switch (status) {
        case 'pending':
          return '#FF9500';
        case 'pending_edit':
          return '#007AFF';
        case 'rejected':
        case 'declined':
          return '#FF3B30';
        default:
          return '#8E8E93';
      }
    };

    const getStatusText = (recipeType: 'pending' | 'published', status?: string) => {
      if (recipeType === 'published') {
        return 'Published';
      }
      
      switch (status) {
        case 'pending':
          return 'Pending Review';
        case 'pending_edit':
          return 'Edit Pending';
        case 'rejected':
        case 'declined':
          return 'Declined';
        default:
          return 'Draft';
      }
    };

    const getStatusIcon = (recipeType: 'pending' | 'published', status?: string) => {
      if (recipeType === 'published') {
        return 'checkmark-circle-outline';
      }
      
      switch (status) {
        case 'pending':
          return 'time-outline';
        case 'pending_edit':
          return 'create-outline';
        case 'rejected':
        case 'declined':
          return 'close-circle-outline';
        default:
          return 'document-outline';
      }
    };

    return (
      <View style={styles.recipeContainer}>
        <View style={styles.recipeCardWrapper}>
          <RecipeCard
            recipe={item}
            onPress={() => router.push(`/recipe/${item.id}` as any)}
          />
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.recipeType, item.status) }]}>
            <Ionicons 
              name={getStatusIcon(item.recipeType, item.status) as any} 
              size={12} 
              color={COLORS.white} 
            />
            <Text style={styles.statusText}>
              {getStatusText(item.recipeType, item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditRecipe(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteRecipe(item.id)}
            activeOpacity={0.7}
            testID="delete-button"
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="restaurant-outline" size={80} color={COLORS.textLight} />
      <Text style={styles.emptyTitle}>No Recipes Yet</Text>
      <Text style={styles.emptySubtitle}>
        You haven't created any recipes yet. Start by adding your first recipe!
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add-outline" size={24} color={COLORS.white} />
        <Text style={styles.addButtonText}>Add Recipe</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeScreen>
        <LoadingSpinner />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Recipes</Text>
          <TouchableOpacity
            style={styles.addHeaderButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={recipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id || `recipe-${Math.random()}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
        />
      </View>
      
      <AddRecipeModal
        visible={showAddModal}
        onClose={handleModalClose}
        onRecipeAdded={handleRecipeAdded}
        onRecipeUpdated={handleRecipeUpdated}
        editMode={!!editingRecipe}
        existingRecipe={editingRecipe || undefined}
      />
      
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: COLORS.text,
              marginBottom: 12
            }}>
              Delete Recipe
            </Text>
            <Text style={{
              fontSize: 16,
              color: COLORS.textLight,
              marginBottom: 24,
              lineHeight: 22
            }}>
              Are you sure you want to delete "{recipeToDelete?.title}"? This action cannot be undone.
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: COLORS.lightGray
                }}
                onPress={cancelDelete}
              >
                <Text style={{
                  color: COLORS.text,
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#FF3B30'
                }}
                onPress={confirmDelete}
              >
                <Text style={{
                  color: COLORS.white,
                  fontWeight: '600'
                }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Confirmation Modal */}
      <Modal
        visible={showEditConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelEditRecipe}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: COLORS.text,
              marginBottom: 12
            }}>
              Edit Published Recipe
            </Text>
            <Text style={{
              fontSize: 16,
              color: COLORS.textLight,
              marginBottom: 24,
              lineHeight: 22
            }}>
              Editing "{recipeToEdit?.title}" will create a draft that needs admin approval. You can continue editing the draft until you're ready to submit it for review.
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: COLORS.border
                }}
                onPress={cancelEditRecipe}
              >
                <Text style={{
                  color: COLORS.text,
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: COLORS.primary
                }}
                onPress={confirmEditRecipe}
              >
                <Text style={{
                  color: COLORS.white,
                  fontWeight: '600'
                }}>
                  Create Draft
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeScreen>
  );
};



export default MyRecipesScreen;