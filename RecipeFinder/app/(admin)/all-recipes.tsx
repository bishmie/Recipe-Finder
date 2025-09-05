import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import { LocalRecipeService } from '../../services/localRecipeService';
import { UserService } from '../../services/userService';
import LoadingSpinner from '../../components/LoadingSpinner';
import type { Recipe } from '../../services/recipeService';
import type { LocalRecipe } from '../../services/localRecipeService';

interface AdminRecipe extends Recipe {
  authorName?: string;
  isLocal?: boolean;
}

const AllRecipesAdmin = () => {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<AdminRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [processingRecipes, setProcessingRecipes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/home');
      return;
    }
    loadAllRecipes();
  }, [isAdmin]);

  useEffect(() => {
    filterRecipes();
  }, [recipes, searchQuery, statusFilter]);

  const loadAllRecipes = async () => {
    try {
      setLoading(true);
      
      // Load both Firebase and local recipes
      const [firebaseRecipes, localRecipes] = await Promise.all([
        RecipeService.getAllRecipesAdmin(),
        LocalRecipeService.getLocalRecipes()
      ]);

      // Convert local recipes to AdminRecipe format
      const convertedLocalRecipes: AdminRecipe[] = await Promise.all(
        localRecipes.map(async (localRecipe: LocalRecipe) => {
          let authorName = 'Unknown';
          try {
            const userProfile = await UserService.getUserProfile(localRecipe.userId);
            authorName = userProfile?.displayName || userProfile?.email || 'Unknown';
          } catch (error) {
            console.log('Could not fetch user profile for:', localRecipe.userId);
          }

          return {
            id: localRecipe.id,
            title: localRecipe.title,
            description: localRecipe.description,
            image: localRecipe.image,
            cookTime: localRecipe.cookTime,
            servings: localRecipe.servings,
            category: localRecipe.category,
            area: localRecipe.area,
            ingredients: localRecipe.ingredients,
            instructions: localRecipe.instructions,
            videoUrl: localRecipe.youtubeUrl,
            userId: localRecipe.userId,
            createdAt: localRecipe.submittedAt,
            updatedAt: localRecipe.submittedAt,
            status: 'pending' as const,
            source: 'firebase' as const,
            authorName,
            isLocal: true,
          };
        })
      );

      // Get author names for Firebase recipes
      const firebaseRecipesWithAuthors: AdminRecipe[] = await Promise.all(
        firebaseRecipes.map(async (recipe) => {
          let authorName = 'Unknown';
          if (recipe.userId) {
            try {
              const userProfile = await UserService.getUserProfile(recipe.userId);
              authorName = userProfile?.displayName || userProfile?.email || 'Unknown';
            } catch (error) {
              console.log('Could not fetch user profile for:', recipe.userId);
            }
          }
          return {
            ...recipe,
            authorName,
            isLocal: false,
          };
        })
      );

      // Combine and sort by creation date
      const allRecipes = [...firebaseRecipesWithAuthors, ...convertedLocalRecipes];
      allRecipes.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      });

      setRecipes(allRecipes);
    } catch (error) {
      console.error('Error loading all recipes:', error);
      Alert.alert('Error', 'Failed to load recipes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRecipes = () => {
    let filtered = recipes;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(recipe => {
        if (statusFilter === 'approved') {
          return recipe.status === 'approved' || !recipe.status;
        }
        return recipe.status === statusFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe => 
        recipe.title.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.authorName?.toLowerCase().includes(query) ||
        recipe.category?.toLowerCase().includes(query)
      );
    }

    setFilteredRecipes(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllRecipes();
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }

    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipe.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setProcessingRecipes(prev => new Set([...prev, recipeId]));
            try {
              let success = false;
              
              if (recipe.isLocal) {
                success = await LocalRecipeService.deleteLocalRecipe(recipeId);
              } else {
                success = await RecipeService.deleteRecipe(recipeId);
              }
              
              if (success) {
                setRecipes(prev => prev.filter(r => r.id !== recipeId));
                Alert.alert('Success', 'Recipe deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete recipe');
              }
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            } finally {
              setProcessingRecipes(prev => {
                const updated = new Set(prev);
                updated.delete(recipeId);
                return updated;
              });
            }
          },
        },
      ]
    );
  };

  const handleEditRecipe = (recipeId: string) => {
    router.push(`/recipe/edit/${recipeId}` as any);
  };

  const handleApproveRecipe = async (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      Alert.alert('Error', 'Recipe not found');
      return;
    }

    if (recipe.status === 'approved') {
      Alert.alert('Info', 'Recipe is already approved');
      return;
    }

    Alert.alert(
      'Approve Recipe',
      `Are you sure you want to approve "${recipe.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessingRecipes(prev => new Set([...prev, recipeId]));
            try {
              let success = false;
              
              if (recipe.isLocal) {
                // Submit local recipe to Firebase and delete from local storage
                const localRecipe = await LocalRecipeService.getLocalRecipeById(recipeId);
                if (localRecipe) {
                  await LocalRecipeService.submitLocalRecipeToFirebase(localRecipe);
                  await LocalRecipeService.deleteLocalRecipe(recipeId);
                  success = true;
                }
              } else {
                success = await RecipeService.approveRecipe(recipeId);
              }
              
              if (success) {
                // Update recipe status in local state
                setRecipes(prev => prev.map(r => 
                  r.id === recipeId 
                    ? { ...r, status: 'approved' as const, isLocal: false }
                    : r
                ));
                Alert.alert('Success', 'Recipe approved successfully');
              } else {
                Alert.alert('Error', 'Failed to approve recipe');
              }
            } catch (error) {
              console.error('Error approving recipe:', error);
              Alert.alert('Error', 'Failed to approve recipe');
            } finally {
              setProcessingRecipes(prev => {
                const updated = new Set(prev);
                updated.delete(recipeId);
                return updated;
              });
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'rejected': return COLORS.error;
      default: return COLORS.success; // Default to approved
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return 'Approved';
    }
  };

  const renderFilterButton = (filter: typeof statusFilter, label: string) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        statusFilter === filter && styles.activeFilterButton
      ]}
      onPress={() => setStatusFilter(filter)}
    >
      <Text style={[
        styles.filterButtonText,
        statusFilter === filter && styles.activeFilterButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderRecipeItem = ({ item }: { item: AdminRecipe }) => {
    const isProcessing = processingRecipes.has(item.id);
    
    return (
      <View style={styles.recipeCard}>
        <Image source={{ uri: item.image }} style={styles.recipeImage} />
        
        <View style={styles.recipeContent}>
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>
          
          <Text style={styles.recipeAuthor}>
            By: {item.authorName || 'Unknown'}
          </Text>
          
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {item.description}
          </Text>
          
          <View style={styles.recipeMetadata}>
            <View style={styles.metadataItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.metadataText}>{item.cookTime}</Text>
            </View>
            
            <View style={styles.metadataItem}>
              <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.metadataText}>{item.servings} servings</Text>
            </View>
            
            {item.isLocal && (
              <View style={styles.metadataItem}>
                <Ionicons name="phone-portrait-outline" size={16} color={COLORS.warning} />
                <Text style={[styles.metadataText, { color: COLORS.warning }]}>Local</Text>
              </View>
            )}
          </View>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.viewButton]}
              onPress={() => router.push(`/recipe/${item.id}` as any)}
            >
              <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.actionButtonText, { color: COLORS.primary }]}>
                View
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditRecipe(item.id)}
              disabled={isProcessing}
            >
              <Ionicons name="pencil-outline" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            
            {item.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleApproveRecipe(item.id)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <LoadingSpinner size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={18} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteRecipe(item.id)}
              disabled={isProcessing}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>All Recipes</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.countBadge}>{filteredRecipes.length}</Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes, authors, categories..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        
        <View style={styles.filterContainer}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('approved', 'Approved')}
          {renderFilterButton('pending', 'Pending')}
          {renderFilterButton('rejected', 'Rejected')}
        </View>
      </View>

      {filteredRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyStateTitle}>No Recipes Found</Text>
          <Text style={styles.emptyStateText}>
            {searchQuery.trim() || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No recipes available at the moment'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={renderRecipeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerRight: {
    width: 40,
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: COLORS.white,
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recipeImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  recipeContent: {
    padding: 16,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  recipeAuthor: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12,
  },
  recipeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadataText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  viewButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButton: {
    backgroundColor: COLORS.warning,
  },
  approveButton: {
    backgroundColor: COLORS.success,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});

export default AllRecipesAdmin;