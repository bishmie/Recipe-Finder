import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import RecipeCard from '../../components/RecipeCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import SafeScreen from '../../components/SafeScreen';
import { AddRecipeModal } from '../../components/ui/AddRecipeModal';
import { Recipe } from '../../types/user';
import { RecipeService } from '../../services/recipeService';
import { LocalRecipeService } from '../../services/localRecipeService';
import type { LocalRecipe } from '../../services/localRecipeService';
import { deleteRecipe } from '../../services/firebaseRecipeService';

const MyRecipesScreen = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadUserRecipes = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      
      // Load both Firebase recipes and local recipes
      const [firebaseRecipes, localRecipes] = await Promise.all([
        RecipeService.getUserRecipesAll(user.uid),
        LocalRecipeService.getUserLocalRecipes(user.uid)
      ]);
      
      // Convert local recipes to Recipe format for display
      const convertedLocalRecipes: Recipe[] = localRecipes.map((localRecipe: LocalRecipe) => ({
        id: localRecipe.id,
        title: localRecipe.title,
        description: localRecipe.description,
        image: localRecipe.image,
        cookTime: localRecipe.cookTime,
        servings: localRecipe.servings,
        category: localRecipe.category,
        area: localRecipe.area,
        youtubeUrl: localRecipe.videoUrl,
        ingredients: localRecipe.ingredients,
        instructions: localRecipe.instructions,
        userId: localRecipe.userId,
        status: 'local_pending' as any,
        createdAt: localRecipe.createdAt,
        updatedAt: localRecipe.createdAt
      }));
      
      // Combine and sort by creation date (newest first)
      const allRecipes = [...firebaseRecipes, ...convertedLocalRecipes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
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
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }

    // Prevent deletion of approved recipes
    if (recipe.status === 'approved') {
      Alert.alert(
        'Cannot Delete',
        'Published recipes cannot be deleted. You can edit them instead, which will change their status back to pending for review.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show confirmation for pending/rejected/local recipes
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              let success = false;
              
              // Check if it's a local recipe or Firebase recipe
              if (recipe.status === 'local_pending' || recipeId.startsWith('local_')) {
                // Delete from local storage
                success = await LocalRecipeService.deleteLocalRecipe(recipeId);
              } else {
                // Delete from Firebase
                success = await RecipeService.deleteRecipe(recipeId);
              }
              
              if (success) {
                setRecipes(recipes.filter(r => r.id !== recipeId));
                Alert.alert('Success', 'Recipe deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete recipe');
              }
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            }
          },
        },
      ]
    );
  };

  const handleEditRecipe = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }
    
    // Navigate to edit screen for both local and Firebase recipes
    router.push(`/recipe/edit/${recipeId}` as any);
  };

  const handleRecipeAdded = (newRecipe: any) => {
    setRecipes(prev => [newRecipe, ...prev]);
    setShowAddModal(false);
  };

  useEffect(() => {
    loadUserRecipes();
  }, [user]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return '#FF9500';
      case 'approved': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'local_pending': return '#007AFF';
      default: return '#34C759';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'approved': return 'checkmark-circle-outline';
      case 'rejected': return 'close-circle-outline';
      case 'local_pending': return 'phone-portrait-outline';
      default: return 'checkmark-circle-outline';
    }
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <View style={styles.recipeContainer}>
      <View style={styles.recipeCardWrapper}>
        <RecipeCard
          recipe={item}
          onPress={() => router.push(`/recipe/${item.id}` as any)}
        />
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Ionicons 
            name={getStatusIcon(item.status) as any} 
            size={12} 
            color={COLORS.white} 
          />
          <Text style={styles.statusText}>
            {item.status === 'local_pending' ? 'Pending' : 
             item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Approved'}
          </Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditRecipe(item.id)}
        >
          <Ionicons name="pencil-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteRecipe(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          keyExtractor={(item) => item.id}
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
        onClose={() => setShowAddModal(false)}
        onRecipeAdded={handleRecipeAdded}
      />
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addHeaderButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  recipeContainer: {
    marginBottom: 20,
  },
  recipeCardWrapper: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flex: 0.48,
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default MyRecipesScreen;