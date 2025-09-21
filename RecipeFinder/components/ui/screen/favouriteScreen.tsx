import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { favoritesStyles } from '@/assets/styles/favorites.styles';
import RecipeCard from '@/components/RecipeCard';
import NoFavoritesFound from '@/components/NoFavoritesFound';
import LoadingSpinner from '@/components/LoadingSpinner';
import { FavoritesService, FavoriteRecipe } from '@/services/favoritesService';
import { Recipe } from '@/services/publishedRecipeService';
import { useAuth } from '@/context/AuthContext';

const FavouriteScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load favorites when user is authenticated
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!user) {
      setFavoriteRecipes([]);
      setLoading(false);
      return;
    }

    loadFavorites();
    
    // Set up real-time listener for favorites
    const unsubscribe = FavoritesService.listenToUserFavorites((favorites: FavoriteRecipe[]) => {
      console.log('Received favorites:', favorites.length);
      const recipes = favorites.map(fav => fav.recipeData);
      setFavoriteRecipes(recipes);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const loadFavorites = async () => {
    try {
      setError(null);
      const favorites = await FavoritesService.getUserFavorites();
      const recipes = favorites.map(fav => fav.recipeData);
      setFavoriteRecipes(recipes);
    } catch (err: any) {
      console.error('Error loading favorites:', err);
      setError(err.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const hasFavorites = favoriteRecipes.length > 0;

  // Show loading spinner while loading
  if (loading) {
    return (
      <SafeAreaView style={favoritesStyles.container}>
        <View style={favoritesStyles.header}>
          <Text style={favoritesStyles.title}>Favorites</Text>
        </View>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <SafeAreaView style={favoritesStyles.container}>
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={favoritesStyles.header}>
            <Text style={favoritesStyles.title}>Favorites</Text>
          </View>
          <View style={favoritesStyles.emptyState}>
            <View style={favoritesStyles.emptyIconContainer}>
              <Ionicons name="alert-circle-outline" size={80} color={COLORS.textLight} />
            </View>
            <Text style={favoritesStyles.emptyTitle}>Error Loading Favorites</Text>
            <Text style={{ textAlign: 'center', color: COLORS.textLight, marginBottom: 24 }}>
              {error}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={favoritesStyles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={favoritesStyles.header}>
          <Text style={favoritesStyles.title}>Favorites</Text>
        </View>

        {hasFavorites ? (
          <View style={favoritesStyles.recipesSection}>
            <FlatList
              data={favoriteRecipes}
              renderItem={({ item }) => <RecipeCard recipe={item} />}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={favoritesStyles.row}
              contentContainerStyle={favoritesStyles.recipesGrid}
              scrollEnabled={false}
            />
          </View>
        ) : (
          <NoFavoritesFound />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FavouriteScreen;