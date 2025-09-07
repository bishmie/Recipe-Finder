import React from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { favoritesStyles } from '@/assets/styles/favorites.styles';
import RecipeCard from '@/components/RecipeCard';
import NoFavoritesFound from '@/components/NoFavoritesFound';

const favoriteRecipes = [
  {
    id: '101',
    title: 'Nasi lemak',
    image: 'https://www.themealdb.com/images/media/meals/wai9bw1619788844.jpg',
    description: 'A fragrant rice dish cooked in coconut milk and pandan leaf.',
    cookTime: '30 minutes',
    servings: '4',
    area: 'Malaysian',
    category: 'Rice',
  },
  {
    id: '102',
    title: 'Turkey Meatloaf',
    image: 'https://www.themealdb.com/images/media/meals/ypuxtw1511297463.jpg',
    description: 'A healthier version of the classic meatloaf made with ground turkey.',
    cookTime: '30 minutes',
    servings: '4',
    area: 'American',
    category: 'Meat',
  },
];

const FavouriteScreen = () => {
  const hasFavorites = favoriteRecipes.length > 0;

  return (
    <SafeAreaView style={favoritesStyles.container}>
      <ScrollView>
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