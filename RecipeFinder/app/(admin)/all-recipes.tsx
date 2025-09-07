import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { COLORS, STATUS_COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { RecipeService } from '../../services/recipeService';
import LoadingSpinner from '../../components/LoadingSpinner';
import { allRecipesStyles as styles } from '../../assets/styles/all-recipes.styles';
import type { Recipe } from '../../services/recipeService';

interface AdminRecipe extends Recipe {
  authorName?: string;
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
      
      // load Firebase recipes
      const firebaseRecipes = await RecipeService.getAllRecipesAdmin();

       const firebaseRecipesWithAuthors: AdminRecipe[] = firebaseRecipes.map((recipe) => {
          return {
            ...recipe,
            authorName: recipe.userId || 'Unknown User',
          };
        });

      // Sort by creation date
      firebaseRecipesWithAuthors.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Most recent first
      });

      setRecipes(firebaseRecipesWithAuthors);
    } catch (error: any) {
      console.error('Error loading all recipes:', error);
      Alert.alert('Error', error?.message || 'Failed to load recipes');
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
              const success = await RecipeService.deleteRecipe(recipeId);
              
              if (success) {
                setRecipes(prev => prev.filter(r => r.id !== recipeId));
                Alert.alert('Success', 'Recipe deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete recipe');
              }
            } catch (error: any) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', error?.message || 'Failed to delete recipe');
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
              const success = await RecipeService.approveRecipe(recipeId);
              
              if (success) {
                // Update recipe status in local state
                setRecipes(prev => prev.map(r => 
                  r.id === recipeId 
                    ? { ...r, status: 'approved' as const }
                    : r
                ));
                Alert.alert('Success', 'Recipe approved successfully');
              } else {
                Alert.alert('Error', 'Failed to approve recipe');
              }
            } catch (error: any) {
              console.error('Error approving recipe:', error);
              Alert.alert('Error', error?.message || 'Failed to approve recipe');
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
      case 'approved': return STATUS_COLORS.success;
      case 'pending': return STATUS_COLORS.warning;
      case 'rejected': return STATUS_COLORS.error;
      default: return STATUS_COLORS.success; // Default to approved
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



export default AllRecipesAdmin;